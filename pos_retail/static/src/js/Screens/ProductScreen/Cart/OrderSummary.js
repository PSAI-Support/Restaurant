odoo.define('pos_retail.OrderSummary', function (require) {
    'use strict';

    const OrderSummary = require('point_of_sale.OrderSummary');
    const Registries = require('point_of_sale.Registries');
    const {useState, useRef, onPatched} = owl.hooks;
    const {onChangeOrder} = require('point_of_sale.custom_hooks');

    const RetailOrderSummary = (OrderSummary) => class extends OrderSummary {
        constructor() {
            super(...arguments);
            onChangeOrder(this._onPrevOrder, this._onNewOrder);
            this.state = useState({total: 0, tax: 0});
        }

        get order() {
            return this.env.pos.get_order();
        }

        async setDiscount() {
            let selectedOrder = this.order
            let {confirmed, payload: discount} = await this.showPopup('NumberPopup', {
                title: this.env._t('Which value of discount Value would you apply to Order ?'),
                startingValue: 0,
                confirmText: this.env._t('Apply'),
                cancelText: this.env._t('Remove Discount'),
            })
            if (confirmed) {
                selectedOrder.set_discount_value(parseFloat(discount))
            }
        }

        _onNewOrder(order) {
            if (order) {
                order.orderlines.on('change', this._updateSummary, this);
                order.orderlines.on('add remove', () => {
                    this._updateSummary();
                }, this);
                order.on('change', this.render, this);
            }
            this._updateSummary();
        }

        _onPrevOrder(order) {
            if (order) {
                order.orderlines.off('new-orderline-selected', null, this);
                order.orderlines.off('change', null, this);
                order.orderlines.off('add remove', null, this);
                order.off('change', null, this);
            }
        }

        _updateSummary() {
            const total = this.order ? this.order.get_total_with_tax() : 0;
            const tax = this.order ? total - this.order.get_total_without_tax() : 0;
            let productsSummary = {}
            let totalItems = 0
            let totalQuantities = 0
            let totalCost = 0
            if (this.order) {
                for (let i = 0; i < this.order.orderlines.models.length; i++) {
                    let line = this.order.orderlines.models[i]
                    totalCost += line.product.standard_price * line.quantity
                    if (!productsSummary[line.product.id]) {
                        productsSummary[line.product.id] = line.quantity
                        totalItems += 1
                    } else {
                        productsSummary[line.product.id] += line.quantity
                    }
                    totalQuantities += line.quantity
                }
            }
            const discount = this.order ? this.order.get_total_discounts() : 0;
            this.state.discount = this.env.pos.format_currency(discount);
            const totalWithOutTaxes = this.order ? this.order.get_total_without_tax() : 0;
            this.state.totalWithOutTaxes = this.env.pos.format_currency(totalWithOutTaxes);
            this.state.margin = this.env.pos.format_currency(totalWithOutTaxes - totalCost)
            this.state.totalItems = this.env.pos.format_currency_no_symbol(totalItems)
            this.state.totalQuantities = this.env.pos.format_currency_no_symbol(totalQuantities)
            this.state.total = this.env.pos.format_currency(total);
            this.state.tax = this.env.pos.format_currency(tax);
            this.render();
        }

        get itemsInCart() {
            if (this._currentOrder && this._currentOrder.orderlines.length > 0) {
                return true
            } else {
                return false
            }
        }
    }
    Registries.Component.extend(OrderSummary, RetailOrderSummary);

    return RetailOrderSummary;
});
