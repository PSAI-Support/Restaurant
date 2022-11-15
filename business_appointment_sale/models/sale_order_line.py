#coding: utf-8

from odoo import fields, models
from odoo.tools.safe_eval import safe_eval


class sale_order_line(models.Model):
    """
    Overwrite to add a link for the appointment
    """
    _inherit = "sale.order.line"

    def _inverse_appointment_id(self):
        """
        Inverse method for appointment_id to adapt product description
        We do that after creation to make sure all onchanges take place
        """
        ICPSudo = self.env["ir.config_parameter"].sudo()
        need_descr = safe_eval(ICPSudo.get_param("ba_sale_appointment_description", default="False"))
        if need_descr:
            for line in self:
                appointment = line.appointment_id
                if appointment:
                    try:
                        line.name += " [{} {}]".format(
                            appointment.name, appointment.return_scheduled_time_tz(True) or ''
                        )
                    except:
                        # name is not updatable
                        pass

    appointment_id = fields.Many2one(
        "business.appointment",
        string="Appointment",
        inverse=_inverse_appointment_id,
    )
