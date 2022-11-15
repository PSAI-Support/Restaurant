odoo.define('pos_retail.ProductsWidgetControlPanel', function (require) {
    'use strict';

    const ProductsWidgetControlPanel = require('point_of_sale.ProductsWidgetControlPanel');
    const {useState} = owl.hooks;
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');
    const {posbus} = require('point_of_sale.utils');

    const RetailProductsWidgetControlPanel = (ProductsWidgetControlPanel) => class extends ProductsWidgetControlPanel {
        constructor() {
            super(...arguments)
            const self = this
            useListener('filter-selected', this._onFilterSelected)
            useListener('search', this._onSearch)
            useListener('clear-search-product-filter', this.clearFilter)
            useListener('show-categories', this._showCategories)
            this.state = useState({
                activeExtendFilter: false, showAllCategory: true
            })
            this.searchDetails = {}
            this.filter = null
            this._initializeSearchFieldConstants()
            this.sepecialFilter = new Map()
            this.sepecialFilter.set('all', {
                key: 'all', text: this.env._t('All Items'),
            })
            this.sepecialFilter.set('out_stock', {
                key: 'out_stock', text: this.env._t('Out of Stock'),
            })
            this.sepecialFilter.set('available_stock', {
                key: 'available_stock', text: this.env._t('Available Stock'),
            })
            this.sepecialFilter.set('tracking_lot', {
                key: 'tracking_lot', text: this.env._t('Tracking by Lot/Serial'),
            })
            this.sepecialFilter.set('is_combo', {
                key: 'bundle', text: this.env._t('Bundle Pack/Combo'),
            })
            this.sepecialFilter.set('addon_id', {
                key: 'addons_items', text: this.env._t('Included Add-ons Items'),
            })
            this.sepecialFilter.set('multi_variant', {
                key: 'multi_variant', text: this.env._t('Multi Variant'),
            })
            this.sepecialFilter.set('multi_unit', {
                key: 'multi_unit', text: this.env._t('Multi Unit Of Measure'),
            })
            this.sepecialFilter.set('multi_barcode', {
                key: 'multi_barcode', text: this.env._t('Multi Barcode'),
            })
        }

        mounted() {
            super.mounted();
            posbus.on('create-new-product', this, this.addProduct);
            posbus.on('create-new-category', this, this.addCategory);
        }

        willUnmount() {
            super.willUnmount()
            posbus.off('create-new-product', null, null);
            posbus.off('create-new-category', null, null);
        }

        _showCategories() {
            // kimanh: stop 12/07/2022
            // this.state.showAllCategory = !this.state.showAllCategory
            this.trigger('switch-category', 0)
        }

        get rootCategoryNotSelected() {
            let selectedCategoryId = this.env.pos.get('selectedCategoryId')
            if (selectedCategoryId == 0) {
                return true
            } else {
                return false
            }
        }

        get Categories() {
            const allCategories = this.env.pos.db.category_by_id
            let categories = []
            for (let index in allCategories) {
                categories.push(allCategories[index])
            }
            return categories
        }

        async getProductsTopSelling() {
            const {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                title: this.env._t('How many Products top Selling you need to show ?'), startingValue: 10,
            })
            if (confirmed) {
                const productsTopSelling = await this.rpc({
                    model: 'pos.order', method: 'getTopSellingProduct', args: [[], parseInt(number)],
                })
                let search_extends_results = []
                this.env.pos.productsTopSelling = {}
                if (productsTopSelling.length > 0) {
                    for (let index in productsTopSelling) {
                        let product_id = productsTopSelling[index][0]
                        let qty_sold = productsTopSelling[index][1]
                        this.env.pos.productsTopSelling[product_id] = qty_sold
                        let product = this.env.pos.db.get_product_by_id(product_id);
                        if (product) {
                            search_extends_results.push(product)
                        }
                    }
                }
                if (search_extends_results.length > 0) {
                    this.env.pos.set('search_extends_results', search_extends_results)
                    posbus.trigger('reload-products-screen')
                    posbus.trigger('remove-filter-attribute')
                }
            }
        }

        async changeSort() {
            let selectionList = [{
                id: 0, label: this.env._t('A to Z'), item: {id: 'a_z', name: this.env._t('A to Z')},
            }, {
                id: 1, label: this.env._t('Z to A'), item: {id: 'z_a', name: this.env._t('Z to A')},
            }, {
                id: 2, label: this.env._t('Low Price'), item: {id: 'low_price', name: this.env._t('Low Price')},
            }, {
                id: 3, label: this.env._t('High Price'), item: {id: 'high_price', name: this.env._t('High Price')},
            }, {
                id: 4,
                label: this.env._t('POS Sequence'),
                item: {id: 'pos_sequence', name: this.env._t('POS Sequence')},
            }]
            const {confirmed, payload: sortKey} = await this.showPopup('SelectionPopup', {
                title: this.env._t('Default Product Sort By Key ?'), list: selectionList,
            });
            if (confirmed) {
                this.env.pos.config.default_product_sort_by = sortKey.id
                this.rpc({
                    model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                        'default_product_sort_by': sortKey.id
                    }],
                }, {shadow: true, timeout: 7500})
            }
        }

        async setProductsView() {
            if (this.env.pos.config.product_view == 'list') {
                this.env.pos.config.product_view = 'box'
            } else {
                this.env.pos.config.product_view = 'list'
            }
            await this.rpc({
                model: 'pos.config', method: 'write', args: [[this.env.pos.config.id], {
                    product_view: this.env.pos.config.product_view,
                }],
            })
            this.env.qweb.forceUpdate();
        }

        async setLimitedProductsDisplayed() {
            const {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                title: this.env._t('How many Products need Display on Products Screen'),
                startingValue: this.env.pos.db.limit,
            })
            if (confirmed) {
                if (number > 0) {
                    if (number > 1000) {
                        return this.showPopup('ErrorPopup', {
                            title: this.env._t('Warning'), body: this.env._t('Maximum can set is 1000')
                        })
                    } else {
                        this.env.pos.db.limit = number
                        this.env.qweb.forceUpdate();
                    }
                } else {
                    this.env.pos.alert_message({
                        title: this.env._t('Warning'), body: this.env._t('Required number bigger than 0')
                    })
                }
            }
        }

        async addCategory() {
            let {confirmed, payload: results} = await this.showPopup('PopUpCreateCategory', {
                title: this.env._t('Create new Category')
            })
            if (confirmed && results['name']) {
                let value = {
                    name: results.name, sequence: results.sequence
                }
                if (results.parent_id != 'null') {
                    value['parent_id'] = results['parent_id']
                }
                if (results.image_128) {
                    value['image_128'] = results.image_128.split(',')[1];
                }
                let category_id = await this.rpc({
                    model: 'pos.category', method: 'create', args: [value]
                })
                let newCategories = await this.rpc({
                    model: 'pos.category', method: 'search_read', args: [[['id', '=', category_id]]],
                })
                const pos_categ_model = this.env.pos.get_model('pos.category');
                if (pos_categ_model) {
                    pos_categ_model.loaded(this.env.pos, newCategories, {});
                }
                this.render()
                await this.env.pos.syncProductsPartners()
                this.showPopup('ConfirmPopup', {
                    title: this.env._t('Successfully'),
                    body: this.env._t('New POS Category just created, and append to your POS Category list'),
                    disableCancelButton: true,
                })
            } else {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'), body: this.env._t('Category Name is required')
                })
            }
        }

        async addProduct(event) {
            let barcode = null
            if (event.code) {
                barcode = event.code
            }
            let {confirmed, payload: results} = await this.showPopup('PopUpCreateProduct', {
                title: this.env._t('Create new Product'), barcode: barcode
            })
            if (confirmed && results) {
                let value = {
                    name: results.name,
                    list_price: results.list_price,
                    default_code: results.default_code,
                    barcode: results.barcode,
                    standard_price: results.standard_price,
                    type: results.type,
                    available_in_pos: true
                }
                if (results.pos_categ_id != 'null') {
                    value['pos_categ_id'] = results['pos_categ_id']
                }
                if (results.product_brand_id != 'null') {
                    value['product_brand_id'] = parseInt(results['product_brand_id'])
                } else {
                    value['product_brand_id'] = null
                }
                if (results.image_1920) {
                    value['image_1920'] = results.image_1920.split(',')[1];
                }
                const product_id = await this.rpc({
                    model: 'product.product', method: 'create', args: [value]
                })
                await this.env.pos._syncProducts()
                let product = this.env.pos.db.get_product_by_id(product_id);
                await this.env.pos.get_order().add_product(product, {
                    quantity: 1, price: product['price'], merge: true
                })
            }
        }

        showExtendSearch() {
            this.state.activeExtendFilter = !this.state.activeExtendFilter
        }

        clearSearch() {
            this.env.pos.set('search_extends_results', null)
            this.searchDetails = {};
            super.clearSearch()
            posbus.trigger('reload-products-screen')
            posbus.trigger('remove-filter-attribute')
        }

        clearFilter() {
            this.env.pos.set('search_extends_results', null)
            this.searchDetails = {};
            posbus.trigger('reload-products-screen')
            posbus.trigger('remove-filter-attribute')
            this.render()
        }

        // TODO: ==================== Search bar example ====================
        get searchBarConfig() {
            const config = {
                searchFields: this.constants.searchFieldNames,
                filter: {show: true, options: this.filterOptions},
                defaultSearchDetails: {
                    fieldName: 'RECEIPT_NUMBER', searchTerm: '',
                },
                defaultFilter: null
            }
            return config
        }

        // TODO: define search fields
        get _searchFields() {
            var fields = {
                'String': (product) => product.search_extend,
                'Product Name': (product) => product.name,
                'Internal Reference': (product) => product.default_code,
                'Barcode': (product) => product.barcode,
                'Supplier Code': (product) => product.supplier_barcode,
                'Price is': (product) => product.lst_price,
                'Sale Category': (product) => product.categ_id[1],
                'Internal Notes': (product) => product.description,
                'Description Sale': (product) => product.description_sale,
                'Description Picking': (product) => product.description_picking,
                'ID': (product) => product.id,
            };
            return fields;
        }

        get filterOptions() {
            return this.sepecialFilter
        }

        get _stateSelectionFilter() {
            return {}
        }

        _initializeSearchFieldConstants() {
            this.constants = {};
            Object.assign(this.constants, {
                searchFieldNames: Object.keys(this._searchFields), stateSelectionFilter: this._stateSelectionFilter,
            });
        }

        _onFilterSelected(event) {
            this.filter = event.detail.filter;
            this._autoComplete()
        }

        _onSearch(event) {
            const searchDetails = event.detail;
            Object.assign(this.searchDetails, searchDetails);
            this._autoComplete()
        }

        _autoComplete() {
            const filterCheck = (product) => {
                if (this.filter == 'all') {
                    return true
                }
                if (this.filter == 'out_stock') {
                    if (product['type'] != 'service' && product.qty_available && product.qty_available <= 0) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'available_stock') {
                    if (product['type'] != 'service' && product.qty_available && product.qty_available > 0) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'tracking_lot') {
                    if (product['tracking'] != 'none') {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'is_combo') {
                    if (product.is_combo) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'addon_id') {
                    if (product.addon_id) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'multi_variant') {
                    if (product.multi_variant) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'multi_unit') {
                    if (product.multi_unit) {
                        return true
                    } else {
                        return false
                    }
                }
                if (this.filter == 'multi_barcode') {
                    if (product.barcode_ids && product.barcode_ids.length != 0) {
                        return true
                    } else {
                        return false
                    }
                }
                this.clearSearch()
                return true;
            };
            const {fieldValue, searchTerm} = this.searchDetails;
            const fieldAccessor = this._searchFields[fieldValue];
            const searchCheck = (product) => {
                if (!fieldAccessor) return true;
                const fieldValue = fieldAccessor(product);
                if (fieldValue === null) return true;
                if (!searchTerm) return true;
                return fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
            };
            const predicate = (product) => {
                return filterCheck(product) && searchCheck(product);
            };
            let products = []
            if (this.filter == 'all') {
                products = this.env.pos.db.get_product_by_category(0);
            } else {
                products = this.env.pos.db.getAllProducts(1000);
            }
            products = products.filter(predicate);
            this.env.pos.set('search_extends_results', products)
            posbus.trigger('reload-products-screen')
            posbus.trigger('remove-filter-attribute')
        }
    }
    Registries.Component.extend(ProductsWidgetControlPanel, RetailProductsWidgetControlPanel);

    return RetailProductsWidgetControlPanel;
});
