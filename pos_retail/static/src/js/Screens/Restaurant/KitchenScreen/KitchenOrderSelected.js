odoo.define('pos_retail.KitchenOrderSelected', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const core = require('web.core');
    const Qweb = core.qweb;
    const models = require('point_of_sale.models');
    const OrderReceipt = require('point_of_sale.OrderReceipt');
    const {posbus} = require('point_of_sale.utils');

    class KitchenOrderSelected extends PosComponent {
        constructor() {
            super(...arguments);
            this.state = {
                order: this.props.order,
            };
        }

        get isHiddenTransferItems() {
            const newIsReady = this.props.order.new.filter(n => n.state != undefined)
            const cancelledIsReady = this.props.order.cancelled.filter(n => n.state != undefined)
            if (newIsReady.length > 0 || cancelledIsReady.length > 0) {
                return false
            } else {
                return true
            }
        }

        get invisiblePriority() {
            const lineStateIsNew = this.props.order.new.filter(n => (n.state == 'New' || n.state == 'Priority') && n.qty > 0)
            if (lineStateIsNew.length > 0 && this.props.order.state != 'Removed' && this.props.order.state != 'Paid') {
                return false
            } else {
                return true
            }
        }

        get isPriority() {
            const lineStateIsPriority = this.props.order.new.filter(n => n.state == 'Priority' && n.qty > 0)
            if (lineStateIsPriority.length > 0) {
                return true
            } else {
                return false
            }
        }

        get needTransfer() {
            const lineNeedTransfer = this.props.order.new.find(n => n.state == 'Ready Transfer')
            if (lineNeedTransfer) {
                return true
            } else {
                return false
            }
        }


        sync() {
            this.env.pos.pos_bus.send_notification({
                action: 'request_printer', data: {
                    uid: this.props.order.uid, computeChanges: this.props.order,
                }, order_uid: this.props.order.uid,
            })
        }

        async printOrder() {
            let orderRequest = this.props.order;
            const self = this;
            this.sync()
            const printers = this.env.pos.printers;
            if (orderRequest['uid']) {
                if (printers && printers.length) {
                    for (var i = 0; i < printers.length; i++) {
                        if (orderRequest['new'].length > 0 || orderRequest['cancelled'].length > 0) {
                            let receipt = Qweb.render('OrderChangeReceipt', {changes: orderRequest, widget: this});
                            await printers[i].print_receipt(receipt);
                        }
                    }
                }
                let receipt = Qweb.render('OrderChangeReceipt', {changes: orderRequest, widget: this});
                this.showScreen('ReportScreen', {
                    report_html: receipt, report_xml: null, orderRequest: orderRequest
                });
            } else {
                this.env.pos.alert_message({
                    title: this.env._t('Warning'), body: this.env._t('Order not found, it have Paid or Remove before')
                })
            }
        }

        openOrder() {
            const orderReceiptSelected = this.props.order;
            const selectedOrder = this.env.pos.get_order_by_uid(orderReceiptSelected.uid)
            if (selectedOrder) {
                this.env.pos.set_order(selectedOrder, {})
                this.sync()
                this.showScreen('ProductScreen')
            }
        }

        get highlight() {
            return this.props.order.selected || false
        }
    }

    KitchenOrderSelected.template = 'KitchenOrderSelected';

    Registries.Component.add(KitchenOrderSelected);

    return KitchenOrderSelected;
});
