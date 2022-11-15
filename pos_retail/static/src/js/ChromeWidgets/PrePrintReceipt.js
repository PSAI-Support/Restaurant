odoo.define('point_of_sale.PrePrintReceipt', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const OrderReceipt = require('point_of_sale.OrderReceipt');
    const core = require('web.core')
    const qweb = core.qweb

    class PrePrintReceipt extends PosComponent {
        constructor() {
            super(...arguments);
        }

        async onClick() {
            const order = this.env.pos.get_order();
            this._currentOrder = order
            if (!order) return;
            if (order.orderlines.length == 0) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'), body: this.env._t('Your order cart is blank')
                })
            }
            const self = this
            for (let i = 0; i < order.orderlines.models.length; i++) {
                let line = order.orderlines.models[i]
                if (line.waitingApproveId) {
                    let requestStatus = await order.validateRequestApproveOrNot(line.uid)
                    if (!requestStatus) {
                        self.showPopup('ErrorPopup', {
                            title: self.env._t('Warning'),
                            body: self.env._t("You need Request Manager approve Action ID ") + line.uid
                        })
                        return false
                    }
                }
            }
            const changes = this._currentOrder.hasChangesToPrint(); // TODO: Only for Restaurant, when cashier get draft bill, we print all request to printer
            order.orderlines.models.forEach(l => { // TODO: set skipped to fail
                if (l.mp_dbclk_time != 0 && l.mp_skip) {
                    this.mp_dbclk_time = 0
                    l.set_skip(false) // skipped is Product is Main Course
                }
            })
            let printers = this.env.pos.printers;
            let orderRequest = null
            for (let i = 0; i < printers.length; i++) {
                let printer = printers[i];
                let changes = order.computeChanges(printer.config.product_categories_ids);
                if (changes['new'].length > 0 || changes['cancelled'].length > 0) {
                    let orderReceipt = order.buildReceiptKitchen(changes);
                    orderRequest = orderReceipt
                    order.saveChanges();
                    if ((order.syncing == false || !order.syncing) && this.env.pos.pos_bus && !this.env.pos.splitbill) {
                        this.env.pos.pos_bus.requests_printers.push({
                            action: 'request_printer', data: {
                                uid: order.uid, computeChanges: orderReceipt,
                            }, order_uid: order.uid,
                        })
                    }
                }
            }
            const fixture = document.createElement('div');
            const orderReceipt = new (Registries.Component.get(OrderReceipt))(null, {order, orderRequest});
            await orderReceipt.mount(fixture);
            const receiptHtml = orderReceipt.el.outerHTML;
            if (this.env.pos.proxy.printer) {
                this.env.pos.proxy.printer.print_receipt(receiptHtml)
            } else {
                this.showScreen('ReportScreen', {
                    report_html: receiptHtml, report_xml: null
                })
            }
        }
    }

    PrePrintReceipt.template = 'PrePrintReceipt';

    Registries.Component.add(PrePrintReceipt);

    return PrePrintReceipt;
});
