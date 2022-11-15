odoo.define('pos_retail.CloseSessionExtend', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const field_utils = require('web.field_utils');
    const QWeb = core.qweb

    class CloseSessionExtend extends PosComponent {

        async onClick() {
            this.trigger('toggle-Menu');
            let ordersUnpaid = this.env.pos.db.get_unpaid_orders()
            const self = this;
            let lists = [{
                name: this.env._t('Close POS Screen'), item: 0, id: 0,
            }, {
                name: this.env._t('Logout Odoo'), item: 1, id: 1,
            },]
            if (this.env.pos.user && this.env.pos.config.allow_closing_session) {
                lists.push({
                    name: this.env._t('Close POS Screen and auto Closing Posting Entries Current Session'),
                    item: 2,
                    id: 2,
                })
                lists.push({
                    name: this.env._t('Close POS Screen, Closing Posting Entries and Logout Odoo'), item: 3, id: 3,
                })
                lists.push({
                    name: this.env._t('Posting Entries of POS Session and Print Z-Report'), item: 4, id: 4,
                })
            }
            if (this.env.pos.config.cash_control && this.env.pos.config.management_session) {
                lists.push({
                    name: this.env._t('Set Closing Cash'), item: 5, id: 5,
                })
            }
            let title = this.env._t('Select 1 Close Type. ')
            if (ordersUnpaid.length > 0) {
                title = title + ordersUnpaid.length + this.env._t(' unpaid Orders, have some draft unpaid orders. You can exit temporarily the Point of Sale, but you will loose that orders if you close the session')
            }
            let {confirmed, payload: selectedCloseTypes} = await this.showPopup('PopUpSelectionBox', {
                title: title, items: lists, onlySelectOne: true,
            });
            if (confirmed && selectedCloseTypes['items'] && selectedCloseTypes['items'].length == 1) {
                const typeId = selectedCloseTypes['items'][0]['id']
                if (typeId == 0) {
                    return this.env.pos.chrome._closePosScreen()
                }
                if (typeId == 1) {
                    return window.location = '/web/session/logout';
                }
                if (typeId == 2) {
                    await this.env.pos.chrome.closingSession()
                    return this.env.pos.chrome._closePosScreen()
                }
                if (typeId == 3) {
                    await this.env.pos.chrome.closingSession()
                    return window.location = '/web/session/logout';
                }
                if (typeId == 4) {
                    await this.env.pos.chrome.closingSession()
                    let params = {
                        model: 'pos.session', method: 'build_sessions_report', args: [[this.env.pos.pos_session.id]],
                    };
                    let values = await this.rpc(params, {shadow: true}).then(function (values) {
                        return values
                    }, function (err) {
                        return self.env.pos.query_backend_fail(err);
                    })
                    let reportData = values[this.env.pos.pos_session.id];
                    let start_at = field_utils.parse.datetime(reportData.session.start_at);
                    start_at = field_utils.format.datetime(start_at);
                    reportData['start_at'] = start_at;
                    if (reportData['stop_at']) {
                        var stop_at = field_utils.parse.datetime(reportData.session.stop_at);
                        stop_at = field_utils.format.datetime(stop_at);
                        reportData['stop_at'] = stop_at;
                    }
                    let reportHtml = QWeb.render('ReportSalesSummarySession', {
                        pos: this.env.pos, report: reportData,
                    })
                    if (this.env.pos.proxy.printer) {
                        this.env.pos.proxy.printer.print_receipt(reportHtml)
                    } else {
                        this.showScreen('ReportScreen', {
                            report_html: reportHtml, report_xml: null,
                        })
                    }
                }
                if (typeId == 5) {
                    await this.env.pos.chrome._setClosingCash()
                }
            }
        }
    }

    CloseSessionExtend.template = 'CloseSessionExtend';

    Registries.Component.add(CloseSessionExtend);

    return CloseSessionExtend;
});
