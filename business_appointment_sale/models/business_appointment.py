#coding: utf-8

from odoo import _, api, fields, models

from odoo.exceptions import ValidationError


class business_appointment(models.Model):
    """
    Overwrite to add a new pricing method for invoicing
    """
    _inherit = "business.appointment"

    @api.depends("order_id.state")
    def _compute_sale_state(self):
        """
        Compute method for sale_state
        """
        for appointment in self:
            appointment.sale_state = appointment.order_id and appointment.order_id.state or False

    order_id = fields.Many2one("sale.order", string="Sale Order")
    sale_state = fields.Char(
        string="Sale State",
        compute=_compute_sale_state,
        store=True,
        compute_sudo=True,
        translate=False,
    )

    @api.model_create_multi
    def create(self, vals_list):
        """
        Re-write to add auto creation option

        Methods:
         * action_create_sale_order
         * action_confirm of sale.order
         * message_subscribe
        """
        appointment_ids = super(business_appointment, self).create(vals_list)
        ICPSudo = self.env["ir.config_parameter"].sudo()
        auto_creation = ICPSudo.get_param("ba_auto_sale_order", default="no")
        if auto_creation != "no":
            order_ids = appointment_ids.action_create_sale_order()
            if auto_creation == "confirmed":
                order_ids.action_confirm()
            elif auto_creation == "sent":
                order_ids.with_context(tracking_disable=True).write({"state": "sent"})
            for order_id in order_ids:
                order_id.message_subscribe(partner_ids=[order_id.partner_id.id])
        return appointment_ids

    def write(self, values):
        """
        Re-write to cancel sale lines if appointment is cancelled, and cancel the order if all lines are cancelled

        Methods:
         * action_cancel of sale order
        """
        res = super(business_appointment, self).write(values)
        if values.get("state") and values.get("state") in ["cancel"]:
            self = self.sudo()
            for appointment in self:
                try:
                    order_id = appointment.order_id
                    if order_id:
                        lines = order_id.order_line.filtered(lambda li: li.appointment_id == appointment)
                        if lines:
                            if appointment.sale_state in ["draft", "sent"]:
                                lines.unlink()
                                if not order_id.order_line:
                                    order_id.action_cancel()
                            else:
                                lines.write({"product_uom_qty": 0})
                                not_empty_lines = order_id.order_line.filtered(lambda li: li.product_uom_qty != 0)
                                if not not_empty_lines:
                                    order_id.action_cancel()
                        else:
                            order_id.action_cancel()
                except Exception as er:
                    # sale line cannot be deleted (e.g. delivered)
                    pass
        return res

    def action_create_sale_order(self):
        """
        The method to prepare a sale order by appointment values

        Methods:
         * _prepare_sale_order_vals

        Returns:
         * sale.order recordset
        """
        user_id = self.env.user
        self = self.sudo()
        partner_ids = self.mapped("partner_id")
        order_ids = self.env["sale.order"]
        for partner_id in partner_ids:
            appointments = self.filtered(lambda appoi: appoi.partner_id == partner_id)
            sale_values = self._prepare_sale_order_vals()
            if not sale_values.get("user_id"):
                sale_values["user_id"] = user_id.id
            order_id = self.env["sale.order"].create(sale_values)
            self.write({"order_id": order_id})
            order_ids += order_id
        return order_ids

    def action_adapt_sale_order(self):
        """
        The method to prepare a sale order by appointment values

        Methods:
         * _prepare_sale_order_vals
        """
        self = self.sudo()
        for appointment in self:
            if appointment.state != "cancel" and appointment.order_id and appointment.sale_state in ["draft", "sent"]:
                try:
                    order_id = appointment.order_id
                    lines = order_id.order_line.filtered(lambda li: li.appointment_id == appointment)
                    if lines:
                        lines.unlink()
                    sale_values = appointment._prepare_sale_order_vals()
                    appointment.order_id.write(sale_values)
                except Exception as er:
                    # sale line cannot be deleted (e.g. delivered)
                    pass
            else:
                raise ValidationError(_("The appointment is cancelled or there is no draft/sent order linked!"))

    def _prepare_sale_order_vals(self):
        """
        The method to prepare sale order values based on appointment params

        Methods:
         * _return_main_line_qty()
         * address_get of res.partner

        Returns:
         * dict
        """
        order_line = []
        m_appointment = self[0]
        for appointment in self:
            related_main_product = appointment.service_id.product_id
            main_line = {
                "product_id": related_main_product.id,
                "product_uom": related_main_product.uom_id.id,
                "product_uom_qty": appointment._return_main_line_qty(),
                "appointment_id": appointment.id,
            }
            order_line.append((0, 0, main_line))
            for extra in appointment.extra_product_ids:
                extra_line = {
                    "product_id": extra.product_id.id,
                    "product_uom": extra.product_id.uom_id.id,
                    "product_uom_qty": extra.product_uom_qty,
                    "appointment_id": appointment.id,
                }
                order_line.append((0, 0, extra_line))
        
        partner_id = m_appointment.partner_id
        addr = partner_id.address_get(['delivery', 'invoice'])
        values = {
            "origin": m_appointment.name,
            "partner_id": partner_id.id,
            "partner_invoice_id": addr.get("invoice"),
            "partner_shipping_id": addr.get("delivery"),
            "pricelist_id": m_appointment.pricelist_id.id or m_appointment.partner_id.property_product_pricelist.id,
            "order_line": order_line,
        }
        user_id = m_appointment.resource_id.default_salesperson_id \
                  or m_appointment.resource_type_id.default_salesperson_id or m_appointment.resource_id.user_id
        team_id = m_appointment.resource_id.default_team_id or m_appointment.resource_type_id.default_team_id
        if user_id:
            values.update({"user_id": user_id.id})
        if team_id:
            values.update({"team_id": team_id.id})
        return values

    def _return_main_line_qty(self):
        """
        The method to calculate main service quantity to be included into a sales order

        Returns:
         * float

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        pricing_method = self.resource_type_id.pricing_method
        qty = 1.00 # for per_planned_duration
        if pricing_method == "per_planned_duration":
            qty = self.duration
        elif pricing_method == "per_real_duration":
            if hasattr(self, "total_real_duration"):
                qty = self.total_real_duration
        return qty
