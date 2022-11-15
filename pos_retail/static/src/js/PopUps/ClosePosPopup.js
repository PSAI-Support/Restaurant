odoo.define('pos_retail.ClosePosPopup', function (require) {
    'use strict';

    const ClosePosPopup = require('point_of_sale.ClosePosPopup');
    const Registries = require('point_of_sale.Registries');

    const RetailClosePosPopup = (ClosePosPopup) =>
        class extends ClosePosPopup {}

    Registries.Component.extend(ClosePosPopup, RetailClosePosPopup);
    return RetailClosePosPopup

});
