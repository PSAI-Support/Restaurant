odoo.define('pos_retail.OrderWidget', function (require) {
    'use strict';

    const OrderWidget = require('point_of_sale.OrderWidget');
    const Registries = require('point_of_sale.Registries');
    const {useState, useRef, onPatched} = owl.hooks;

    const RetailOrderWidget = (OrderWidget) => class extends OrderWidget {
        constructor() {
            super(...arguments);
        }

        async _editPackLotLines(event) {
            let self = this;
            const orderline = event.detail.orderline;
            const isAllowOnlyOneLot = orderline.product.isAllowOnlyOneLot();
            const packLotLinesToEdit = orderline.getPackLotLinesToEdit(isAllowOnlyOneLot);
            if (packLotLinesToEdit.length == 1 && packLotLinesToEdit[0].text == "" && this.env.pos.config.fullfill_lots && ['serial', 'lot'].includes(orderline.product.tracking)) {
                let packLotLinesToEdit = await this.rpc({
                    model: 'stock.production.lot',
                    method: 'search_read',
                    domain: [['product_id', '=', orderline.product.id]],
                    fields: ['name', 'id']
                }).then(function (value) {
                    return value
                }, function (error) {
                    self.env.pos.query_backend_fail(error)
                    return false
                })
                if (!packLotLinesToEdit) {
                    packLotLinesToEdit = this.env.pos.lots.filter(l => l.product_id && l.product_id[0] == product['id'])
                }
                let newPackLotLinesToEdit = packLotLinesToEdit.map((lot) => ({text: lot.name}));
                const {confirmed, payload} = await this.showPopup('EditListPopup', {
                    title: this.env._t('Selection only 1 Lot/Serial Number(s). It a required'),
                    isSingleItem: isAllowOnlyOneLot,
                    array: newPackLotLinesToEdit,
                });
                if (confirmed) {
                    const modifiedPackLotLines = Object.fromEntries(payload.newArray.filter(item => item.id).map(item => [item.id, item.text]));
                    const newPackLotLines = payload.newArray
                        .filter(item => !item.id)
                        .map(item => ({lot_name: item.text}));
                    if (newPackLotLines.length == 1) {
                        orderline.setPackLotLines({modifiedPackLotLines, newPackLotLines});
                    } else {
                        return this.env.pos.alert_message({
                            title: this.env._t('Warning'), body: this.env._t('Please select only one Lot/Serial')
                        })
                    }
                }
                this.order.select_orderline(event.detail.orderline);
            } else {
                await super._editPackLotLines(event)
            }
        }

        // TODO: odoo core call render, if cart have bigger than 50 items, have many lagging cart
        _onNewOrder(order) {
            if (order) {
                order.orderlines.on('new-orderline-selected', () => this.trigger('new-orderline-selected'), this) // reset keyboard to base mode quantity
                order.orderlines.on('add remove', () => {
                    this.scrollToBottom = true
                    this._updateSummary()
                }, this)
            }
            this.trigger('new-orderline-selected');
        }

        _updateSummary() {
            const start = Date.now();
            if (this.order && this.order.get_client() && this.env.pos.retail_loyalty) {
                let points = this.order.get_client_points()
                let plus_point = points['plus_point']
                this.order.plus_point = plus_point
                this.order.redeem_point = points['redeem_point']
                this.order.remaining_point = points['remaining_point']
            }

            if (this.env.pos.config.customer_facing_screen) {
                this.env.pos.trigger('refresh.customer.facing.screen');
            }
            if (this.env.pos.config.iface_customer_facing_display) {
                this.env.pos.send_current_order_to_customer_facing_display();
            }
            console.log('>>> running _updateSummary')
            this.render()
            const end = Date.now();
            console.log(`Execution time: ${end - start} ms`);
        }
        // =================================================================
    }

    Registries.Component.extend(OrderWidget, RetailOrderWidget);

    return RetailOrderWidget;
});
