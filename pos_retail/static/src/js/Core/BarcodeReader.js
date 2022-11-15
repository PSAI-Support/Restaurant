odoo.define('pos_retail.BarcodeReader', function (require) {
    var BarcodeReader = require('point_of_sale.BarcodeReader');
    const {posbus} = require('point_of_sale.utils');

    BarcodeReader.include({

        init: function (attributes) {
            this._super(attributes)
            // only chrome on android supported nfc !!!
            //$(_.bind(this.start_nfc, this, false));
        },

        start_nfc: function() {
            if ("nfc" in navigator) {
                navigator.nfc
                    .watch(
                        _.bind(function(message) {
                            if (this.pos.debug) {
                                console.log("NFC scanning:", JSON.stringify(message));
                            }
                            _.each(
                                message.records,
                                function(r) {
                                    if (r.recordType === "text") {
                                        this.scan(r.data);
                                    }
                                },
                                this
                            );
                        }, this),
                        {mode: "any"}
                    )
                    .catch(err => console.log("Adding NFC watch failed: " + err.name));
            } else {
                console.log("NFC API is not supported.");
            }
        },

        scan: async function (code) {
            this._super(code)
            const callbacks = Object.keys(this.exclusive_callbacks).length ? this.exclusive_callbacks : this.action_callbacks;

            let response = null
            if (callbacks && callbacks['loginBadgeId']) {
                response = await [...callbacks['loginBadgeId']][0](code)
            }
            if (!response && callbacks && callbacks['validateManager']) {
                response = await [...callbacks['validateManager']][0](code)
            }
            if (!response && callbacks && callbacks['voucher']) {
                response = await [...callbacks['voucher']][0](code)
            }
            if (!response && callbacks && callbacks['new_order']) {
                response = await [...callbacks['new_order']][0](code)
            }
        },

        connect_to_proxy: function () {
            if (odoo.session_info.iot_installed) {
                console.log('>>> iotbox installed return core')
                return this._super()
            }
            var self = this;
            this.remote_scanning = true;
            if (this.remote_active >= 1) {
                return;
            }
            this.remote_active = 1;
            let link = '/hw_proxy/scanner'
            if (!odoo.session_info.iot_installed) {
                link = '/hw_proxy/get_scanner'
            }

            function waitforbarcode() {
                console.log('calling scanner: ' + link)
                return self.proxy.connection.rpc(link, {}, {shadow: true, timeout: 7500})
                    .then(function (barcode) {
                        if (!self.remote_scanning) {
                            self.remote_active = 0;
                            return;
                        }
                        if (barcode) {
                            console.log('>>>> found barcode: ' + barcode)
                        }
                        self.scan(barcode);
                        waitforbarcode();
                    }, function () {
                        if (!self.remote_scanning) {
                            self.remote_active = 0;
                            return;
                        }
                        waitforbarcode();
                    });
            }

            waitforbarcode();
        },
    });
});
