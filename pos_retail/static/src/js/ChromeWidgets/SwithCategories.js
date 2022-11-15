odoo.define('pos_retail.SwithCategories', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const field_utils = require('web.field_utils');

    class SwithCategories extends PosComponent {

        async onClick() {
            this.trigger('toggle-Menu');
            let pos_category_model = this.env.pos.get_model('pos.category');
            let categories = await this.env.pos.rpc({
                model: 'pos.category',
                method: 'search_read',
                args: [[['id', 'in', this.env.pos.config.load_direct_categ_ids]], pos_category_model.fields]
            })
            categories.forEach(function (c) {
                c.display_name = c.name
            })
            let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                title: this.env._t('Select POS Categories'), items: categories
            })
            if (confirmed) {
                let iface_available_categ_ids = _.pluck(results.items, 'id')
                if (iface_available_categ_ids.length) {
                    await this.rpc({
                        model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                            'limit_categories': true,
                            'iface_available_categ_ids': [[6, false, iface_available_categ_ids]]
                        }], context: {'update_from_pos': true}
                    })
                } else {
                    await this.rpc({
                        model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                            'limit_categories': false, 'iface_available_categ_ids': [[6, false, []]]
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

    SwithCategories.template = 'SwithCategories';

    Registries.Component.add(SwithCategories);

    return SwithCategories;
});
