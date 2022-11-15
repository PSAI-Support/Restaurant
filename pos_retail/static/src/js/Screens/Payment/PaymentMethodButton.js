odoo.define('pos_retail.PaymentMethodButton', function (require) {
    'use strict';

    const PaymentMethodButton = require('point_of_sale.PaymentMethodButton');
    const Registries = require('point_of_sale.Registries');
    PaymentMethodButton.template = 'RetailPaymentMethodButton'

    const RetailPaymentMethodButton = (PaymentMethodButton) => class extends PaymentMethodButton {
        constructor() {
            super(...arguments);
            this._currentOrder = this.env.pos.get_order();
            this._currentOrder.paymentlines.on('change', this.render, this);
        }

        get paymentAmount() {
            let paymentLines = this._currentOrder.paymentlines.models.filter(p => p.payment_method && p.payment_method.id == this.props.paymentMethod.id)
            if (paymentLines && paymentLines.length > 0) {
                let total = 0
                paymentLines.forEach(p => {
                    total += p.amount
                })
                return total
            } else {
                return 0
            }
        }

        get isSelected() {
            let paymentLine = this._currentOrder.paymentlines.models.find(p => p.payment_method && p.selected && p.payment_method.id == this.props.paymentMethod.id)
            if (paymentLine) {
                return true
            } else {
                return false
            }
        }

        get isHidden() {
            // if (this.props.paymentMethod && this.props.paymentMethod.journal && this.props.paymentMethod.journal.pos_method_type == 'voucher') {
            //     return true
            // }
            if (this._currentOrder && this._currentOrder.get_client()) {
                const client = this._currentOrder.get_client()
                const wallet = client.wallet
                const balance_credit = client.balance
                if ((this.props.paymentMethod && this.props.paymentMethod.journal && this.props.paymentMethod.journal.pos_method_type == 'credit' && balance_credit <= 0) || (this.props.paymentMethod && this.props.paymentMethod.journal && this.props.paymentMethod.journal.pos_method_type == 'wallet' && wallet <= 0)) {
                    return true
                }
            }
            return false
        }
    }

    Registries.Component.extend(PaymentMethodButton, RetailPaymentMethodButton);
});
