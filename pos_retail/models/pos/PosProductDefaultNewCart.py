# -*- coding: utf-8 -*-
from odoo import models, fields, api, _


class PosProductDefaultNewCart(models.Model):
    _name = "pos.product.default.new.cart"
    _description = "Products default add to cart if create new order"

    name = fields.Char('Name', required=1)
    product_id = fields.Many2one(
        'product.product',
        string='Product',
        domain=[('available_in_pos', '=', True)],
        required=1
    )
    quantity = fields.Float('Quantity', required=1)
