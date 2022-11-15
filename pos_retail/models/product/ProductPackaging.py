# -*- coding: utf-8 -*-
from odoo import api, fields, models, _

class ProductPackaging(models.Model):
    _inherit = "product.packaging"

    list_price = fields.Float('Sale price')
    active = fields.Boolean('Active', default=1)
    pack_uom_id = fields.Many2one('uom.uom', string='Unit of Measure of Pack')
    pack_uom_ids = fields.Many2many('uom.uom', string='Units the same Category', compute='_get_uoms_the_same_category')

    def _get_uoms_the_same_category(self):
        for pack in self:
            if pack.product_id and pack.product_id.uom_id:
                uoms = self.env['uom.uom'].search([('category_id', '=', pack.product_id.uom_id.category_id.id)])
                pack.pack_uom_ids = [(6, 0, [uom.id for uom in uoms])]
            else:
                pack.pack_uom_ids = [(6, 0, [])]