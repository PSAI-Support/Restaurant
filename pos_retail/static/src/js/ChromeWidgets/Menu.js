odoo.define('pos_retail.Menu', function (require) {
    'use strict';
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class Menu extends PosComponent {
        onClick() {
            this.trigger('toggle-Menu');
        }
    }

    Menu.template = 'Menu';
    Registries.Component.add(Menu);
    return Menu;
});