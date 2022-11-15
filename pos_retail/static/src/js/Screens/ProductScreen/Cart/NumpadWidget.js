odoo.define('pos_retail.NumpadWidget', function (require) {
    'use strict';

    const NumpadWidget = require('point_of_sale.NumpadWidget');
    const Registries = require('point_of_sale.Registries');

    NumpadWidget.template = 'NumpadWidgetRetail';
    Registries.Component.add(NumpadWidget);

    const RetailNumpadWidget = (NumpadWidget) =>
        class extends NumpadWidget {
            constructor() {
                super(...arguments);
            }

            get invisibleDiscountButton() {
                if (!this.env.pos.config.allow_discount || this.blockScreen || this.env.session.restaurant_order) {
                    return true
                } else {
                    return false
                }
            }

            get invisibleNumpad() {
                if (!this.env.pos.config.allow_numpad) {
                    return true
                } else {
                    return false
                }
            }

            async _validateMode(mode) {
                if (mode == 'discount' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_discount)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Discount')
                    })
                    return false;
                }
                if (mode == 'quantity' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_qty)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Quantity')
                    })
                    return false;
                }
                if (mode == 'price' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_price)) {
                    this.env.pos.alert_message({
                        title: this.env._t('Alert'),
                        body: this.env._t('You have not Permission change Quantity')
                    })
                    return false;
                }
                return true
            }

            get blockScreen() {
                const selectedOrder = this.env.pos.get_order();
                if (!selectedOrder || !selectedOrder.is_return) {
                    return false
                } else {
                    return true
                }
            }
        }
    Registries.Component.extend(NumpadWidget, RetailNumpadWidget);

    return NumpadWidget;
});
