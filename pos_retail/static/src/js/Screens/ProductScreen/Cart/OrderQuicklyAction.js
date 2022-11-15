odoo.define('pos_retail.OrderQuicklyAction', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const {useState} = owl.hooks;

    class OrderQuicklyAction extends PosComponent {
        constructor() {
            super(...arguments);
        }

        get order() {
            return this.env.pos.get_order();
        }

        get client() {
            return this.env.pos.get_order().get_client();
        }

        get getKey() {
            return "`"
        }

    }

    OrderQuicklyAction.template = 'OrderQuicklyAction';

    Registries.Component.add(OrderQuicklyAction);

    return OrderQuicklyAction;
});
