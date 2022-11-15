odoo.define('pos_retail.OrderCartAction', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const {useState} = owl.hooks;
    const Registries = require('point_of_sale.Registries');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const {useListener} = require('web.custom_hooks');
    const {posbus} = require('point_of_sale.utils')

    class OrderCartAction extends PosComponent {
        constructor() {
            super(...arguments);
            this.state = useState({
                numpadMode: 'quantity',
            })
        }

        mounted() {
            super.mounted();
            posbus.on('numpad-change-mode', this, this._updateNumpadMode);
        }

        willUnmount() {
            super.willUnmount()
            posbus.off('numpad-change-mode', null, null)
        }

        async editCustomer(client) {
            this.partnerIntFields = ['title', 'country_id', 'state_id', 'property_product_pricelist', 'id']
            let {confirmed, payload: results} = await this.showPopup('PopUpCreateCustomer', {
                title: this.env._t('Update Informaton of ') + client.name,
                partner: client
            })
            if (confirmed) {
                if (results.error) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Error'),
                        body: results.error
                    })
                }
                const partnerValue = {
                    'name': results.name,
                }
                if (results.image_1920) {
                    partnerValue['image_1920'] = results.image_1920.split(',')[1]
                }
                if (results.title) {
                    partnerValue['title'] = results.title
                }
                if (!results.title && this.env.pos.partner_titles) {
                    partnerValue['title'] = this.env.pos.partner_titles[0]['id']
                }
                if (results.street) {
                    partnerValue['street'] = results.street
                }
                if (results.city) {
                    partnerValue['city'] = results.city
                }
                if (results.vat) {
                    partnerValue['vat'] = results.vat
                }
                if (results.street) {
                    partnerValue['street'] = results.street
                }
                if (results.phone) {
                    partnerValue['phone'] = results.phone
                }
                if (results.mobile) {
                    partnerValue['mobile'] = results.mobile
                }

                if (results.birthday_date) {
                    partnerValue['birthday_date'] = results.birthday_date
                }
                if (results.barcode) {
                    partnerValue['barcode'] = results.barcode
                }
                if (results.comment) {
                    partnerValue['comment'] = results.comment
                }
                if (results.property_product_pricelist) {
                    partnerValue['property_product_pricelist'] = results.property_product_pricelist
                } else {
                    partnerValue['property_product_pricelist'] = null
                }
                if (results.country_id) {
                    partnerValue['country_id'] = results.country_id
                }
                let valueWillSave = {}
                for (let [key, value] of Object.entries(partnerValue)) {
                    if (this.partnerIntFields.includes(key)) {
                        valueWillSave[key] = parseInt(value) || false;
                    } else {
                        if ((key == 'birthday_date' && value != client.birthday_date) || key != 'birthday_date') {
                            valueWillSave[key] = value;
                        }
                    }
                }
                let partner_id = client.id
                let updatePartner = await this.rpc({
                    model: 'res.partner',
                    method: 'write',
                    args: [[partner_id], valueWillSave],
                    context: {}
                })
                if (updatePartner) {
                    await this.env.pos._syncPartners()
                    let partner = this.env.pos.db.get_partner_by_id(partner_id);
                    if (partner) {
                        this.env.pos.get_order().set_client(partner)
                    }
                }
            }
        }

        async _updateNumpadMode(event) {
            const {mode} = event.detail;
            this.state.numpadMode = mode;
        }

        async setTaxes() {
            let order = this.env.pos.get_order();
            let selectedLine = order.get_selected_orderline();
            if (!selectedLine) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('Have not any line in cart')
                })
            }
            if (selectedLine.is_return || order.is_return) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('it not possible set taxes on Order return')
                })
            }
            if (selectedLine) {
                let taxes_id = selectedLine.product.taxes_id;
                let taxes = [];
                let update_tax_ids = this.env.pos.config.update_tax_ids || [];
                this.env.pos.taxes.forEach(function (t) {
                    if (update_tax_ids.indexOf(t.id) != -1) {
                        if (taxes_id.indexOf(t.id) != -1) {
                            t.selected = true
                        }
                        taxes.push(t)
                    }
                })
                if (taxes.length) {
                    let {confirmed, payload: result} = await this.showPopup('PopUpSelectionBox', {
                        title: this.env._t('Select Taxes need to apply'),
                        items: taxes
                    })
                    let tax_ids = []
                    if (confirmed) {
                        if (result.items.length) {
                            tax_ids = result.items.filter((i) => i.selected).map((i) => i.id)
                            let taxesString = selectedLine.product.display_name + this.env._t(' applied Taxes: ')
                            result.items.forEach(t => {
                                taxesString += t.name + '.'
                            })
                            this.env.pos.alert_message({
                                title: this.env._t('Successfully set Taxes'),
                                body: taxesString
                            })
                        } else {
                            this.env.pos.alert_message({
                                title: this.env._t('Successfully remove all Taxes'),
                                body: ''
                            })
                        }
                    }
                    await this._appliedTaxes(tax_ids)

                }
            } else {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('Please selected 1 line for set taxes')
                })
            }

        }

        async _appliedTaxes(tax_ids) {
            let order = this.env.pos.get_order();
            let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                title: this.env._t('Need Confirm ?'),
                body: this.env._t('Apply Taxes Selected to All Line ?'),
            })
            if (!confirmed) {
                order.get_selected_orderline().set_taxes(tax_ids);
            } else {
                order.orderlines.models.forEach(l => {
                    l.set_taxes(tax_ids)
                })
            }
        }


    }

    OrderCartAction.template = 'OrderCartAction';

    Registries.Component.add(OrderCartAction);

    return OrderCartAction;
});
