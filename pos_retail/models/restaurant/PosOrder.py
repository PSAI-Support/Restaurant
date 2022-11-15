# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models

import logging
import json
import base64

_logger = logging.getLogger(__name__)


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    note = fields.Char('Note')
    mp_skip = fields.Boolean('Skip line when sending ticket to kitchen printers.')


class PosOrder(models.Model):
    _inherit = 'pos.order'

    checkin_time = fields.Datetime('Check In')

    @api.model
    def get_table_draft_orders(self, session_id, table_id):
        table_orders = self.search([
            ('state', '=', 'draft'),
            ('session_id', '=', session_id),
            ('table_id', '=', table_id),
        ])
        orders = []
        for o in table_orders:
            if o.order_json:
                orders.append(json.loads(base64.decodebytes(o.order_json).decode('utf-8')))
        return orders
