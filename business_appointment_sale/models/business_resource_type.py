#coding: utf-8

from odoo import fields, models


class business_resource_type(models.Model):
    """
    Overwrite to add sales team / salesperson default
    """
    _inherit = "business.resource.type"

    default_team_id = fields.Many2one("crm.team", string="Default sales team")
    default_salesperson_id = fields.Many2one("res.users", string="Default salesperson")
