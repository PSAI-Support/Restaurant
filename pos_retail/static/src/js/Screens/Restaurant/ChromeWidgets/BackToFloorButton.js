// odoo.define('pos_retail.BackToFloorButton', function (require) {
//     'use strict';
//
//     const BackToFloorButton = require('pos_restaurant.BackToFloorButton');
//     const Registries = require('point_of_sale.Registries');
//
//     const RetailBackToFloorButton = (BackToFloorButton) =>
//         class extends BackToFloorButton {
//             async backToFloorScreen() {
//                 if (this.env.pos.config.auto_order) {
//                     let selectedOrder = this.env.pos.get_order();
//                     if (selectedOrder.hasChangesToPrint()) {
//                         const isPrintSuccessful = await selectedOrder.printChanges();
//                         if (isPrintSuccessful) {
//                             selectedOrder.saveChanges();
//                         }
//                     }
//                 }
//                 super.backToFloorScreen()
//             }
//         }
//     Registries.Component.extend(BackToFloorButton, RetailBackToFloorButton);
//
//     return RetailBackToFloorButton;
// });

odoo.define('pos_retail.BackToFloorButton', function (require) {
    'use strict';

    const BackToFloorButton = require('pos_restaurant.BackToFloorButton');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');

    const RetailBackToFloorButton = (BackToFloorButton) =>
        class extends BackToFloorButton {
            backToFloorScreen() {
                posbus.trigger('set-screen', 'Floors', {floor: this.floor})
                this.env.pos.set('selectedCategoryId', 0);
                const orderList = this.env.pos.get_order_list()
                this.env.pos.sync_from_server(null, orderList, this.env.pos.get_order_with_uid());
                this.env.pos.set_order(null);
                this.env.pos.table = null;
                super.backToFloorScreen()
            }
        }
    Registries.Component.extend(BackToFloorButton, RetailBackToFloorButton);

    return RetailBackToFloorButton;
});

