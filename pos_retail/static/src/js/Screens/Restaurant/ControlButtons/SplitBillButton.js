odoo.define('pos_retail.SplitBillButton', function (require) {
    'use strict';

    const SplitBillButton = require('pos_restaurant.SplitBillButton');
    const {posbus} = require('point_of_sale.utils');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require('web.custom_hooks');

    const RetailSplitBillButton = (SplitBillButton) =>
        class extends SplitBillButton {

            async onClick() {
                await super.onClick()
            }
        }
    Registries.Component.extend(SplitBillButton, RetailSplitBillButton);

    return RetailSplitBillButton;
});
