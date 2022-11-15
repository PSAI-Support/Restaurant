# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.tools import float_is_zero


class PosMakePayment(models.TransientModel):
    _inherit = 'pos.make.payment'

    def add_payment(self, data):
        self.env['pos.payment'].create(data)
        order = self.env['pos.order'].browse(data['pos_order_id'])
        currency = order.currency_id
        order.amount_paid = sum(order.payment_ids.mapped('amount'))
        if order.amount_paid > order.amount_total:
            return_payment_vals = {
                'name': _('return'),
                'pos_order_id': order.id,
                'amount': - (order.amount_paid - order.amount_total),
                'payment_date': fields.Datetime.now(),
                'payment_method_id': data.get('payment_method_id'),
                'is_change': True,
            }
            order.add_payment(return_payment_vals)
        if float_is_zero(order.amount_total - order.amount_paid, precision_rounding=currency.rounding):
            order.action_pos_order_paid()
        return order.id
