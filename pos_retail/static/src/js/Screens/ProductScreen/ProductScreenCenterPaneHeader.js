odoo.define('pos_retail.ProductScreenCenterPaneHeader', function (require) {
    'use strict';
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');
    const ControlButtonsMixin = require('point_of_sale.ControlButtonsMixin');
    const {useState} = owl.hooks;
    const {posbus} = require('point_of_sale.utils');
    const {useListener} = require('web.custom_hooks')

    class ProductScreenCenterPaneHeader extends ControlButtonsMixin(PosComponent) {
        constructor() {
            super(...arguments);
            this.state = useState({
                inputCustomer: '', countCustomers: 0
            });
            this._currentOrder = this.env.pos.get_order();
            this._currentOrder.orderlines.on('change', this.render, this);
            this.env.pos.on('change:selectedOrder', this._updateCurrentOrder, this);
            useListener('clear-search-customer', this._clearSearch);
        }

        _updateCurrentOrder(pos, newSelectedOrder) {
            this._currentOrder.orderlines.off('change', null, this);
            if (newSelectedOrder) {
                this._currentOrder = newSelectedOrder;
                this._currentOrder.orderlines.on('change', this.render, this);
            }
        }

        willUnmount() {
            this._currentOrder.orderlines.off('change', null, this);
            this._currentOrder.off('change:selectedOrder', null, this);
        }

        clickSendToKitchen() {
            const self = this
            posbus.trigger('print-kitchen-receipt')
            setTimeout(() => {
                self.render()
            }, 200)
        }

        _clearSearch() {
            this.state.inputCustomer = ""
            this.state.countCustomers = 0
            this.el.querySelector('.search-customer').classList.remove('active')

        }


        get isLongName() {
            let selectedOrder = this.env.pos.get_order()
            if (selectedOrder && selectedOrder.get_client()) {
                return selectedOrder.get_client() && selectedOrder.get_client().name.length > 10;
            } else {
                return false
            }
        }

        get isCustomerSet() {
            if (this.env.pos.get_order() && this.env.pos.get_order().get_client()) {
                return true
            } else {
                return false
            }
        }

        get client() {
            if (this._currentOrder) {
                return this._currentOrder.get_client()
            } else {
                return null
            }
        }

        get currentOrder() {
            return this.env.pos.get_order();
        }

        async UpdateTheme() {
            await this.showPopup('PopUpUpdateTheme', {
                title: this.env._t('Modifiers POS Theme'),
            })
        }

        get isActiveShowGuideKeyboard() {
            return this.env.isShowKeyBoard
        }

        async showKeyBoardGuide() {
            this.env.isShowKeyBoard = !this.env.isShowKeyBoard;
            this.env.qweb.forceUpdate();
            return this.showPopup('ConfirmPopup', {
                title: this.env._t('Tip !!!'),
                body: this.env._t('Press any key to Your Keyboard, POS Screen auto focus Your Mouse to Search Products Box. Type something to Search Box => Press to [Tab] and => Press to Arrow Left/Right for select a Product. => Press to Enter for add Product to Cart'),
                disableCancelButton: true,
            })
        }

        get addedClasses() {
            if (!this._currentOrder) return {};
            const changes = this._currentOrder.hasChangesToPrint();
            const skipped = changes ? false : this._currentOrder.hasSkippedChanges();
            let oe_hidden = true
            if (this.env.pos.printers && this.env.pos.printers.length > 0) {
                oe_hidden = false
            }
            if (this.env.pos.session.restaurant_order) {
                oe_hidden = true
            }
            let disabled = false
            if (!changes) {
                disabled = true
            }
            return {
                highlight: changes,
                altlight: skipped,
                oe_hidden: oe_hidden,
                disabled: disabled
            };
        }

        get blockScreen() {
            const selectedOrder = this.env.pos.get_order();
            if (!selectedOrder || !selectedOrder.is_return) {
                return false
            } else {
                return true
            }
        }

        async adNewCustomer() {
            let {confirmed, payload: results} = await this.showPopup('PopUpCreateCustomer', {
                title: this.env._t('Create New Customer'), mobile: ''
            })
            if (confirmed) {
                if (results.error) {
                    return this.env.pos.alert_message({
                        title: this.env._t('Error'), body: results.error
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
                    partnerValue['property_product_pricelist'] = this.env.pos.pricelists[0].id
                }
                if (results.country_id) {
                    partnerValue['country_id'] = results.country_id
                }
                let partner_id = await this.rpc({
                    model: 'res.partner', method: 'create', args: [partnerValue], context: {}
                })
                if (partner_id) {
                    this.updateCustomer(partner_id)
                }
            }
        }

        async onKeydown(event) {
            const partners = this.env.pos.db.search_partner(this.state.inputCustomer)
            if (partners.length > 0) {
                let partners_list = []
                partners.forEach(p => {
                    let partner_str = p.display_name
                    if (p.mobile) {
                        partner_str += " - " + p.mobile
                    }
                    if (p.phone) {
                        partner_str += " - " + p.phone
                    }
                    partners_list.push(`<li data-id="` + p.id + `">${partner_str}</li>`)
                })
                partners_list = partners_list.join('')
                this.state.countCustomers = partners.length
                const at_box = this.el.querySelector(".autocom-box")
                at_box.innerHTML = partners_list
                this.el.querySelector('.search-customer').classList.add('active')
                const all_partners_el = this.el.querySelector(".autocom-box").querySelectorAll("li")
                for (let i = 0; i < all_partners_el.length; i++) {
                    all_partners_el[i].addEventListener('click', this.setCustomerToOrder);
                }
            } else {
                this.state.countCustomers = 0
                this.el.querySelector('.search-customer').classList.remove('active')
            }
        }

        get countItemsNeedPrint() {
            const selectedOrder = this.env.pos.get_order();
            if (!selectedOrder) {
                return 0
            }
            let countItemsNeedToPrint = 0
            let printers = this.env.pos.printers;
            for (let i = 0; i < printers.length; i++) {
                let changes = selectedOrder.computeChanges(printers[i].config.product_categories_ids);
                if (changes['new'].length > 0 || changes['cancelled'].length > 0) {
                    countItemsNeedToPrint += changes['new'].length
                    countItemsNeedToPrint += changes['cancelled'].length
                }
            }
            return countItemsNeedToPrint
        }

        setCustomerToOrder(event) {
            const partner_id = event.target.dataset.id
            const partner = self.posmodel.db.partner_by_id[partner_id]
            const order = self.posmodel.get_order()
            if (partner && order) {
                order.set_client(partner)
            }
            document.querySelector('.search-customer').classList.remove('active')
        }

        get client() {
            if (this._currentOrder) {
                return this._currentOrder.get_client()
            } else {
                return null
            }
        }

        get isLongName() {
            let selectedOrder = this.env.pos.get_order()
            if (selectedOrder && selectedOrder.get_client()) {
                return selectedOrder.get_client() && selectedOrder.get_client().name.length > 10;
            } else {
                return false
            }
        }

        get isCustomerSet() {
            if (this.env.pos.get_order() && this.env.pos.get_order().get_client()) {
                return true
            } else {
                return false
            }
        }

        async updateCustomer(partner_id) {
            let datas = await this.env.pos.getDatasByModel('res.partner', [['id', '=', partner_id]], null, {})
            if (datas.length == 1) {
                datas[0]['write_date'] = this.env.pos.db.write_date_by_model['res.partner']
                this.env.pos.update_indexDB('res.partner', datas)
                let partner = this.env.pos.db.get_partner_by_id(partner_id);
                if (partner) {
                    this.env.pos.get_order().set_client(partner)
                }
            }
        }

        async editCustomer(client) {
            this.partnerIntFields = ['title', 'country_id', 'state_id', 'property_product_pricelist', 'id']
            let {confirmed, payload: results} = await this.showPopup('PopUpCreateCustomer', {
                title: this.env._t('Update Informaton of ') + client.name, partner: client
            })
            if (confirmed) {
                if (results.error) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Error'), body: results.error
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
                await this.rpc({
                    model: 'res.partner', method: 'write', args: [[partner_id], valueWillSave], context: {}
                })
                this.updateCustomer(partner_id)
            }
        }
    }

    ProductScreenCenterPaneHeader.template = 'ProductScreenCenterPaneHeader';

    Registries.Component.add(ProductScreenCenterPaneHeader);

    return ProductScreenCenterPaneHeader;
});
