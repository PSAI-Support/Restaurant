odoo.define('pos_retail.FloorScreen', function (require) {
    'use strict';

    const FloorScreen = require('pos_restaurant.FloorScreen');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');

    const RetailFloorScreen = (FloorScreen) => class extends FloorScreen {
        constructor() {
            super(...arguments);
        }

        mounted() {
            // super.mounted(); // kimanh: we no need call super because super order set table is null
            posbus.on('refresh:FloorScreen', this, this.render);
            if (this.env.pos.iot_connections && this.env.pos.iot_connections.length) {
                this.env.pos.config.sync_multi_session = true
            }
            posbus.trigger('start-cash-control')
        }

        willUnmount() {
            super.willUnmount();
            posbus.off('refresh:FloorScreen', this, null);
        }

        async _tableLongpolling() {
            if (this.env.pos.config.sync_multi_session) {
                return true
            } else {
                super._tableLongpolling()
            }
        }

        get activeFloor() {
            let floor = super.activeFloor
            if (this.state.selectedFloorId == 0) {
                let table_ids = []
                let tables = []
                const orders = this.env.pos.get('orders').models
                if (orders.length) {
                    for (let i = 0; i < orders.length; i++) {
                        let o = orders[i]
                        if (o.table && table_ids.indexOf(o.table.id) == -1) {
                            table_ids.push(o.table.id)
                        }
                    }
                }
                for (let i = 0; i < table_ids.length; i++) {
                    let table = this.env.pos.tables_by_id[table_ids[i]]
                    tables.push(table)
                }
                tables = tables.sort(this.env.pos.sort_by('name', false, function (a) {
                    if (!a) {
                        a = 'N/A';
                    }
                    return a.toUpperCase()
                }));
                floor['tables'] = tables
            }
            return floor
        }
    }
    Registries.Component.extend(FloorScreen, RetailFloorScreen);

    return RetailFloorScreen;
});
