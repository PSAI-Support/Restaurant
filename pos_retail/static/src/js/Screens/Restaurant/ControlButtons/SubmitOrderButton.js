odoo.define('pos_retail.SubmitOrderButton', function (require) {
    'use strict';

    const SubmitOrderButton = require('pos_restaurant.SubmitOrderButton');
    SubmitOrderButton.template = 'RetailSubmitOrderButton'
    const Registries = require('point_of_sale.Registries');
    const core = require('web.core');
    const QWeb = core.qweb;
    const {posbus} = require('point_of_sale.utils')

    const RetailSubmitOrderButton = (SubmitOrderButton) =>
        class extends SubmitOrderButton {
            constructor() {
                super(...arguments);
            }

            mounted() {
                super.mounted();
                posbus.on('print-kitchen-receipt', this, this.onClick)
            }

            willUnmount() {
                super.willUnmount()
                posbus.off('print-kitchen-receipt', this, null)
            }


            showReceipt() {
                const printers = this.env.pos.printers;
                const selectedOrder = this.env.pos.get_order()
                for (let i = 0; i < printers.length; i++) {
                    let changes = selectedOrder.computeChanges(printers[i].config.product_categories_ids);
                    if (changes['new'].length > 0 || changes['cancelled'].length > 0) {
                        let orderReceipt = selectedOrder.buildReceiptKitchen(changes);
                        if ((selectedOrder.syncing == false || !selectedOrder.syncing) && this.env.pos.pos_bus && !this.env.pos.splitbill) {
                            this.env.pos.pos_bus.requests_printers.push({
                                action: 'request_printer',
                                data: {
                                    uid: selectedOrder.uid,
                                    computeChanges: orderReceipt,
                                },
                                order_uid: selectedOrder.uid,
                            })
                        }
                    }
                }
                return true;
            }

            get addedClasses() {
                let classElement = super.addedClasses
                if (!this._currentOrder) return classElement;
                const changes = this._currentOrder.hasChangesToPrint();
                return classElement
            }

            async onClick() {
                const order = this.env.pos.get_order()
                this.showReceipt()
                if (order && order.hasChangesToPrint() && this.env.pos.proxy.printer && this.env.pos.config.proxy_ip) {
                    order.saveChanges()
                } else {
                    if (!order.hasChangesToPrint()) {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t('Have not any Lines in Cart need send to Kitchen Screen or Printers')
                        })
                    }
                    super.onClick()
                }
            }

            get countItemsNeedPrint() {
                const selectedOrder = this.env.pos.get_order();
                if (!selectedOrder) {
                    return 0
                }
                let countItemsNeedToPrint = 0
                let printers = this.env.pos.printers;
                for (let i = 0; i < printers.length; i++) {
                    let changes = selectedOrder.computeChanges(printers[i].config.product_categories_ids);
                    if (changes['new'].length > 0 || changes['cancelled'].length > 0) {
                        countItemsNeedToPrint += changes['new'].length
                        countItemsNeedToPrint += changes['cancelled'].length
                    }
                }
                return countItemsNeedToPrint
            }
        }
    Registries.Component.extend(SubmitOrderButton, RetailSubmitOrderButton);

    return RetailSubmitOrderButton;
});