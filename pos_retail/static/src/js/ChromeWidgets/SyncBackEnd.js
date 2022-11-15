odoo.define('point_of_sale.SyncBackEnd', function (require) {
    'use strict';

    const {useState} = owl;
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const Session = require('web.Session')
    const {posbus} = require('point_of_sale.utils');

    class SyncBackEnd extends PosComponent {
        constructor() {
            super(...arguments);
            const synch = {
                status: 'connected', msg: ''
            }
            this.state = useState({status: synch.status, msg: synch.msg});
        }

        async onClick() {
            this.state.status = 'connecting'
            this.state.msg = this.env._t('Syncing Products and Customers')
            const serverOrigin = this.env.pos.session.origin;
            const connection = new Session(void 0, serverOrigin, {
                use_cors: true
            });
            const pingServer = await connection.rpc('/pos/passing/login', {}).then(function (result) {
                return result
            }, function (error) {
                return false;
            })
            if (!pingServer) {
                this.state.status = 'error'
                this.state.msg = this.env._t('Odoo Server Offline')
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Odoo Server Offline'),
                    body: this.env._t('Your internet or Odoo server Offline, not possible refresh POS Database Cache')
                })
            }
            const results = await this.env.pos.syncProductsPartners(true)
            this.state.status = 'connected'
            this.showPopup('ConfirmPopup', {
                title: this.env._t('Sync Successfully !!!'),
                body: this.env._t('Customers updated to time:') + results['partnerLastWriteDate'] + this.env._t('(GMT) . Products updated to time: ') + results['productLastWriteDate'] + '(GMT)'
            })
        }
    }

    SyncBackEnd.template = 'SyncBackEnd';

    Registries.Component.add(SyncBackEnd);

    return SyncBackEnd;
});
