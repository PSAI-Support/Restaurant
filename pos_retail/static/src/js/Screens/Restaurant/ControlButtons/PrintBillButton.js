odoo.define('pos_retail.PrintBillButton', function (require) {
    'use strict';

    const PrintBillButton = require('pos_restaurant.PrintBillButton');
    const Registries = require('point_of_sale.Registries');
    const OrderReceipt = require('point_of_sale.OrderReceipt')

    const RetailPrintBillButton = (PrintBillButton) => class extends PrintBillButton {
        async onClick() {
            let order = this.env.pos.get_order()
            const orderRequest = null
            const isBill = true
            const fixture = document.createElement('div')
            const orderReceipt = new (Registries.Component.get(OrderReceipt))(null, {order, orderRequest, isBill})
            await orderReceipt.mount(fixture)
            const receiptHtml = orderReceipt.el.outerHTML
            if (this.env.pos.config.bluetooth_printer) {
                const cashIsOpen = order.is_paid_with_cash() || order.get_change()
                const printer = new Printer(null, this.env.pos)
                const xhttp = new XMLHttpRequest()
                const receiptString = receiptHtml
                const ticketImage = await printer.htmlToImg(receiptString)
                xhttp.open("POST", "http://" + this.env.pos.config.bluetooth_device_ip_address + ":9200", true);
                let receiptObj = {}
                const copie = this.env.pos.config.bluetooth_receipt_copies;
                receiptObj = {
                    image: ticketImage, text: "------ Bill Draft ------", "openCashDrawer": !!cashIsOpen, copies: 1
                }
                const receiptJSON = JSON.stringify(receiptObj)
                xhttp.send(receiptJSON)
                return true
            } else {
                if (this.env.pos.proxy.printer) {
                    this.env.pos.proxy.printer.print_receipt(receiptHtml)
                } else {
                    this.showScreen('ReportScreen', {
                        report_html: receiptHtml, report_xml: null,
                    })
                }
            }
            order.pre_print = true
            order.trigger('change')
        }
    }
    Registries.Component.extend(PrintBillButton, RetailPrintBillButton);

    return RetailPrintBillButton;
});
