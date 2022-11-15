odoo.define('pos_retail.SwithFloors', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const field_utils = require('web.field_utils');

    class SwithFloors extends PosComponent {

        async onClick() {
            this.trigger('toggle-Menu');
            let floor_model = this.env.pos.get_model('restaurant.floor');
            let floors = await this.env.pos.rpc({
                model: 'restaurant.floor',
                method: 'search_read',
                args: [[['id', 'in', this.env.pos.config.load_direct_floor_ids]], floor_model.fields]
            })
            floors.forEach(function (c) {
                c.display_name = c.name
            })
            let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                title: this.env._t('Select Floors'), items: floors
            })
            if (confirmed) {
                let floor_ids = _.pluck(results.items, 'id')
                if (floor_ids.length) {
                    await this.rpc({
                        model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                            'is_table_management': true, 'floor_ids': [[6, false, floor_ids]]
                        }], context: {'update_from_pos': true}
                    })
                } else {
                    await this.rpc({
                        model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                            'is_table_management': false, 'floor_ids': [[6, false, []]]
                        }], context: {'update_from_pos': true}
                    })
                }
                let {confirmed, payload: confirm} = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Are you want reload POS Screen'),
                })
                if (confirmed) {
                    this.env.pos.reload_pos()
                }
            }
        }
    }

    SwithFloors.template = 'SwithFloors';

    Registries.Component.add(SwithFloors);

    return SwithFloors;
});
