odoo.define('pos_retail.ButtonMergeTable', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const {useListener} = require('web.custom_hooks');
    const Registries = require('point_of_sale.Registries');

    class ButtonMergeTable extends PosComponent {
        constructor() {
            super(...arguments);
            useListener('click', this.onClick);
        }

        mounted() {
            this.env.pos.get('orders').on('add remove change', () => this.render(), this);
            this.env.pos.on('change:selectedOrder', () => this.render(), this);
        }

        willUnmount() {
            this.env.pos.get('orders').off('add remove change', null, this);
            this.env.pos.off('change:selectedOrder', null, this);
        }

        get isHighlighted() {
            let orders = this.env.pos.get('orders');
            if (orders.length > 1) return true
            else return false
        }

        async onClick() {
            let selectedOrder = this.env.pos.get('selectedOrder');
            if (selectedOrder.hasChangesToPrint()) {
                await selectedOrder.printChanges()
            }
            let orders = this.env.pos.get('orders');
            let ordersAllowMerge = orders.filter((o) => o.uid != selectedOrder.uid).map((o) => ({
                id: o.uid,
                item: o,
                label: o.table.floor.name + ' / ' + o.table.name
            }))
            let {confirmed, payload: order} = await this.showPopup('SelectionPopup', {
                title: this.env._t('Please select one Table need merge to current Order'),
                list: ordersAllowMerge
            })
            if (confirmed) {
                for (let index in order.orderlines.models) {
                    let lineTransfer = order.orderlines.models[index]
                    let mp_skip = lineTransfer.mp_skip
                    let mp_dirty = lineTransfer.mp_dirty
                    let newLine = lineTransfer.clone();
                    selectedOrder.add_orderline(newLine);
                    let selectedLine = selectedOrder.get_selected_orderline();
                    selectedLine.set_skip(lineTransfer.mp_skip)
                    selectedLine.set_dirty(lineTransfer.mp_dirty)
                    selectedLine.moved = true
                    selectedLine.trigger('change', selectedLine);
                    if (!selectedLine.mp_dirty) {
                        selectedOrder.saveChanges()
                    }
                }
                order._setOrdertoCancel(this.env._t("MERGE TO order: ") + selectedOrder.uid)
                order.finalize()
            }
        }
    }

    ButtonMergeTable.template = 'ButtonMergeTable';

    ProductScreen.addControlButton({
        component: ButtonMergeTable,
        condition: function () {
            return this.env.pos.config.allow_merge_table && this.env.pos.tables && this.env.pos.tables.length;
        },
        position: ['after', 'SubmitOrderButton'],
    });

    Registries.Component.add(ButtonMergeTable);

    return ButtonMergeTable;
});
