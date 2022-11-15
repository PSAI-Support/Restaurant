odoo.define('pos_retail.SaleDetailsButton', function (require) {
    'use strict';

    const SaleDetailsButton = require('point_of_sale.SaleDetailsButton');
    const Registries = require('point_of_sale.Registries');
    const core = require('web.core');
    const qweb = core.qweb;

    const RetailSaleDetailsButton = (SaleDetailsButton) => class extends SaleDetailsButton {
        constructor() {
            super(...arguments);
        }

        async onClick() {
            if (this.env.pos.proxy.printer) {
                return await super.onClick()
            } else {
                const saleDetails = await this.rpc({
                    model: 'report.point_of_sale.report_saledetails',
                    method: 'get_sale_details',
                    args: [false, false, false, [this.env.pos.pos_session.id]],
                });
                const report_html = this.env.qweb.renderToString('SaleSummaryOfCurrentSessionReport', Object.assign({}, saleDetails, {
                    date: new Date().toLocaleString(), pos: this.env.pos,
                }))
                if (this.env.pos.proxy.printer) {
                    this.env.pos.proxy.printer.print_receipt(report_html)
                } else {
                    this.showScreen('ReportScreen', {
                        report_html: report_html, report_xml: null
                    })
                }
            }
        }
    }
    Registries.Component.extend(SaleDetailsButton, RetailSaleDetailsButton);

    return RetailSaleDetailsButton;
});
