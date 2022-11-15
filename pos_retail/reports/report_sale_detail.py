# -*- coding: utf-8 -*-
from odoo import fields, models, api
from odoo.osv.expression import AND


class ReportSaleDetails(models.AbstractModel):
    _inherit = "report.point_of_sale.report_saledetails"

    # TODO: removed at 9.8.2022 because report not group by product_id, price_unit and discount
    # @api.model
    # def get_sale_details(self, date_start=False, date_stop=False, config_ids=False, session_ids=False):
    #     baseDatas = super(ReportSaleDetails, self).get_sale_details(date_start=date_start, date_stop=date_stop,
    #                                                                 config_ids=config_ids, session_ids=session_ids)
    #     if not date_start and not date_stop and not config_ids and session_ids:
    #         products_sold = {}
    #         domain = [('state', 'in', ['paid', 'invoiced', 'done'])]
    #         domain = AND([domain, [('session_id', 'in', session_ids)]])
    #         orders = self.env['pos.order'].search(domain)
    #         for order in orders:
    #             for line in order.lines:
    #                 key = (line.product_id, line.price_unit, line.discount, line.price_subtotal_incl)
    #                 products_sold.setdefault(key, 0.0)
    #                 products_sold[key] += line.qty
    #         baseDatas['datetime'] = fields.Datetime.today()
    #         baseDatas['products'] = sorted([{
    #             'product_id': product.id,
    #             'product_name': product.name,
    #             'code': product.default_code,
    #             'quantity': qty,
    #             'price_unit': price_unit,
    #             'discount': discount,
    #             'price_subtotal_incl': price_subtotal_incl,
    #             'uom': product.uom_id.name
    #         } for (product, price_unit, discount, price_subtotal_incl), qty in products_sold.items()],
    #             key=lambda l: l['product_name'])
    #     return baseDatas
