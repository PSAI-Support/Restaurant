odoo.define('point_of_sale.ReloadPOS', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class ReloadPOS extends PosComponent {
        constructor() {
            super(...arguments);
        }

        async onClick() {
            this.env.pos.reload_pos()
        }
    }

    ReloadPOS.template = 'ReloadPOS';

    Registries.Component.add(ReloadPOS);

    return ReloadPOS;
});
