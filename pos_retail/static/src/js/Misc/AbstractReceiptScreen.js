odoo.define('pos_retail.AbstractReceiptScreen', function (require) {
    'use strict';

    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');
    const Registries = require('point_of_sale.Registries');
    const {Printer} = require('point_of_sale.Printer');

    const RetailAbstractReceiptScreen = (AbstractReceiptScreen) =>
        class extends AbstractReceiptScreen {
            constructor() {
                super(...arguments);
            }

            get currentOrder() {
                return this.env.pos.get_order();
            }

            get_is_openCashDrawer() {
                return this.currentOrder.is_paid_with_cash() || this.currentOrder.get_change();
            }

            async _printReceipt() {
                if (this.env.pos.config.bluetooth_printer) {
                    const printer = new Printer(null, this.env.pos)
                    const xhttp = new XMLHttpRequest();
                    for (var i = 0; i < $(".pos-receipt").length; i++) {
                        const receiptString = $(".pos-receipt")[i].outerHTML
                        const ticketImage = await printer.htmlToImg(receiptString)
                        let copie = this.env.pos.config.bluetooth_receipt_copies
                        if (copie == 0) {
                            copie = 1
                        }
                        xhttp.open("POST", "http://" + this.env.pos.config.bluetooth_device_ip_address + ":9200", true)
                        let receiptObj = {}
                        receiptObj = {
                            image: ticketImage,
                            text: "",
                            "openCashDrawer": !!this.get_is_openCashDrawer(),
                            copies: copie
                        }
                        const receiptJSON = JSON.stringify(receiptObj)
                        xhttp.send(receiptJSON)
                    }
                } else {
                    return super._printReceipt()
                }
            }
        }
    Registries.Component.extend(AbstractReceiptScreen, RetailAbstractReceiptScreen);

    return RetailAbstractReceiptScreen;
});
