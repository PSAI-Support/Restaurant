# -*- coding: utf-8 -*-
from odoo import api, fields, models


class PosTrackingOrder(models.TransientModel):
    _name = "pos.tracking.order"
    _description = "POS Tracking Order"
    _order = 'time_action DESC'

    time_action = fields.Datetime(string='Time Action', default=fields.Datetime.now)
    order_reference = fields.Char('Order Reference', required=1)
    order_id = fields.Many2one('pos.order', 'Order')
    name = fields.Char('Name')
    user_id = fields.Many2one('res.users', 'User (Staff)', readonly=1)
    action = fields.Selection([
        ('selected_order', 'Change Order'),
        ('new_order', 'Add Order'),
        ('unlink_order', 'Remove Order'),
        ('line_removing', 'Remove Line'),
        ('set_client', 'Set Customer'),
        ('add_new_line', 'Add new Line'),
        ('trigger_update_line', 'Update Line'),
        ('change_pricelist', 'Add Pricelist'),
        ('sync_sequence_number', 'Sync Sequence Order'),
        ('lock_order', 'Lock Order'),
        ('unlock_order', 'Unlock Order'),
        ('set_line_note', 'Set Line Note'),
        ('set_state', 'Set State'),
        ('order_transfer_new_table', 'Transfer to New Table'),
        ('set_customer_count', 'Set Guest'),
        ('request_printer', 'Request Printer'),
        ('set_note', 'Set Order Note'),
        ('paid_order', 'Paid Order'),
        ('print_bill_before_paid', 'Print Bill before Paid')
    ], string='Action', readonly=1)
    json_data = fields.Text('Json Data Order')