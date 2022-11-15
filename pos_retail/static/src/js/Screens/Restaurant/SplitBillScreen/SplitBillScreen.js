odoo.define('pos_retail.SplitBillScreen', function (require) {
    'use strict';

    const SplitBillScreen = require('pos_restaurant.SplitBillScreen');
    const models = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');

    const RetailSplitBillScreen = (SplitBillScreen) => class extends SplitBillScreen {
        constructor() {
            super(...arguments);
        }

        back() {
            super.back()
        }

        async proceed() {
            if (_.isEmpty(this.splitlines))
                // Splitlines is empty
                return;
            let {confirmed, payload: confirm} = await this.showPopup('ConfirmPopup', {
                title: this.env._t('You just Confirmed Split Items and do Payment !!!'),
                body: this.env._t('So, Are you want send Split Items to Kitchen Screen, if Yes please click Send button'),
                confirmText: this.env._t('Send'),
                cancelText: this.env._t('No Send')
            })
            if (confirmed) {
                super.proceed()
            } else {
                this._isFinal = true;
                delete this.newOrder.temporary;

                if (this._isFullPayOrder()) {
                    this.showScreen('PaymentScreen');
                } else {
                    this._setQuantityOnCurrentOrder();

                    this.newOrder.set_screen_data({name: 'PaymentScreen'});
                    //
                    if (this.newOrder.saveChanges) {
                        this.currentOrder.orderlines.each(function (line) {
                            line.set_dirty(false);
                        });
                        this.currentOrder.saved_resume = this.currentOrder.build_line_resume();
                        this.currentOrder.trigger('change', this.currentOrder);

                        this.newOrder.orderlines.each(function (line) {
                            line.set_dirty(false);
                        });
                        this.newOrder.saved_resume = this.newOrder.build_line_resume();
                        this.newOrder.trigger('change', this.newOrder);
                    }

                    this.newOrder.set_customer_count(1);
                    const newCustomerCount = this.currentOrder.get_customer_count() - 1;
                    this.currentOrder.set_customer_count(newCustomerCount || 1);
                    this.currentOrder.set_screen_data({name: 'ProductScreen'});

                    this.env.pos.get('orders').add(this.newOrder);
                    this.env.pos.set('selectedOrder', this.newOrder);
                }
            }
        }

        async doTransferTable() {
            var oldOrder = this.currentOrder;
            let lists = this.env.pos.tables.filter((t) => t.id != oldOrder.table.id).map((t) => ({
                id: t.id, item: t, label: t.floor.name + ' / ' + t.name
            }))
            let {confirmed, payload: table} = await this.showPopup('SelectionPopup', {
                title: this.env._t('Alert, please select table need moving Lines just selected'), list: lists
            })
            if (confirmed) {
                if (_.isEmpty(this.splitlines))
                    // Splitlines is empty
                    return;
                this._isFinal = true;
                this.transferLines(table)
                delete this.newOrder.temporary;
            }
        }

        getTableOrdered(table_id) {
            var orders = this.env.pos.get('orders').models
            for (var i = 0; i < orders.length; i++) {
                var order = orders[i];
                if (order.table && order.table.id == table_id) {
                    return order
                }
            }
            return null;
        }

        async transferLines(table) {
            // todo: currentOrder (1) has selected split, newOrder is split from (1), toOrder: is order transfer clone lines selected
            // case 1: line has send receipt to kitchen ==> auto set selectedOrder to saveChanges()
            // case 2: line not send to kitchen
            // - items processing by kitchen done or not ?
            // - if done ?
            // - if not done ?
            var oldOrder = this.currentOrder;
            var ordered = this.getTableOrdered(table.id);
            let lineMoves = [];
            for (let id in this.splitlines) {
                if (this.splitlines[id].quantity > 0) {
                    lineMoves.push(this.splitlines[id])
                }
            }
            if (lineMoves.length == 0) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Error'),
                    body: this.env._t('Please select minimum 1 line of Order Lines')
                })
            }
            let toOrder = null;
            if (ordered == null) {
                toOrder = new models.Order({}, {
                    pos: this.env.pos,
                });
                toOrder.table = table;
                this.env.pos.get('orders').add(toOrder);
            } else {
                toOrder = ordered;
            }
            for (let line_id in this.splitlines) {
                let liveMove = this.newOrderLines[line_id];
                let qtyMove = this.splitlines[line_id].quantity;
                if (this.splitlines[line_id].quantity > 0) {
                    let last_mp_dirty = liveMove.mp_dirty
                    let last_mp_skip = liveMove.mp_skip
                    let newLine = liveMove.clone();
                    toOrder.add_orderline(newLine);
                    newLine.set_quantity(qtyMove)
                    let lineWillUpdate = oldOrder.get_orderline(parseInt(line_id));
                    if (lineWillUpdate.quantity == qtyMove) {
                        oldOrder.remove_orderline(lineWillUpdate);
                    } else {
                        lineWillUpdate.set_quantity(lineWillUpdate.quantity - qtyMove, 'do not recompute unit price')
                        lineWillUpdate.set_note(this.env._t("Move to table with qty: ") + qtyMove)
                    }
                    newLine.mp_dirty = last_mp_dirty
                    newLine.mp_skip = last_mp_skip
                    if (!newLine.mp_dirty) {
                        toOrder.saveChanges()
                    }
                    newLine.moved = true
                    newLine.trigger('change', newLine);
                }
            }
            toOrder.trigger('change', toOrder);
            toOrder.set_screen_data({name: 'ProductScreen'});
            // if (toOrder.hasChangesToPrint()) {
            //     const isPrintSuccessful = await toOrder.printChanges();
            //     if (isPrintSuccessful) {
            //         toOrder.saveChanges();
            //     }
            // }
            oldOrder.set_screen_data({name: 'ProductScreen'});
            if (oldOrder.orderlines.length == 0) {
                oldOrder.finalize()
                oldOrder._setOrdertoCancel(this.env._t("MERGE TO order: ") + toOrder.uid)
            }
            this.env.pos.set('selectedOrder', toOrder);
            this.showScreen('ProductScreen');
        }
    }
    Registries.Component.extend(SplitBillScreen, RetailSplitBillScreen);

    return RetailSplitBillScreen;
});
