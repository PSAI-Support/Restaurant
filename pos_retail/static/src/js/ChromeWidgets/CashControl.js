odoo.define('pos_retail.CashControl', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const field_utils = require('web.field_utils');

    class CashControl extends PosComponent {

        async onClick() {
            const self = this
            this.trigger('toggle-Menu');
            let sessions = await this.env.pos.rpc({
                model: 'pos.session',
                method: 'search_read',
                args: [[['id', '=', this.env.pos.pos_session.id]]]
            })
            if (sessions.length) {
                const sessionSelected = sessions[0]
                let startedAt = field_utils.parse.datetime(sessionSelected.start_at);
                sessionSelected.start_at = field_utils.format.datetime(startedAt);
                let {confirmed, payload: values} = await this.showPopup('CashSession', {
                    title: this.env._t('Management Cash In/Out of Your Session'),
                    session: sessionSelected
                })
                if (confirmed) {
                    let action = values.action;
                    if ((action == 'putMoneyIn' || action == 'takeMoneyOut') && values.value.amount != 0) {
                        await this.env.pos.rpc({
                            model: 'cash.box.out',
                            method: 'cash_input_from_pos',
                            args: [0, values.value],
                        }).then(function () {
                            return self.onClick()
                        })
                    }
                    if (action == 'setClosingBalance' && values.value.length > 0) {
                        await this.env.pos.rpc({
                            model: 'account.bank.statement.cashbox',
                            method: 'validate_from_ui',
                            args: [0, this.env.pos.pos_session.id, 'end', values.value],
                        }).then(function () {
                            return self.onClick()
                        })
                    }
                }
            }
            return true
        }
    }

    CashControl.template = 'CashControl';

    Registries.Component.add(CashControl);

    return CashControl;
});
