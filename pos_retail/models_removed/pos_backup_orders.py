# -*- coding: utf-8 -*-
from odoo import api, models, fields, registry
import json
import logging

_logger = logging.getLogger(__name__)

class PosBackUpOrders(models.TransientModel):
    _name = "pos.backup.orders"
    _description = "This is table save all orders on POS Session, if POS Session Crash. POS Users can restore back all Orders"
