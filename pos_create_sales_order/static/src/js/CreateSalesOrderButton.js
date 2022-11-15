odoo.define('pos_create_sales_order.CreateSalesOrderButton', function(require) {
	'use strict';

	const PosComponent = require('point_of_sale.PosComponent');
	const ProductScreen = require('point_of_sale.ProductScreen');
	const { useListener } = require('web.custom_hooks');
	let core = require('web.core');
	let _t = core._t;
	const Registries = require('point_of_sale.Registries');


	class CreateSalesOrderButton extends PosComponent {
		constructor() {
			super(...arguments);
			useListener('click', this.onClick);
		}
			
		async onClick(){
			var self = this;
			var order = self.env.pos.get_order();
			var orderlines = order.orderlines;
			var cashier_id = self.env.pos.get_cashier().user_id[0];
			var partner_id = false;
			var pos_product_list = [];

			if (order.get_client() != null)
				partner_id = order.get_client().id;
			
			if (!partner_id) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Unknown customer'),
					body: self.env._t('You cannot Create Sales Order. Select customer first.'),
				});
			}

			if (orderlines.length === 0) {
				return self.showPopup('ErrorPopup', {
					title: self.env._t('Empty Order'),
					body: self.env._t('There must be at least one product in your order before Add a note.'),
				});
			}
			
			for (var i = 0; i < orderlines.length; i++) {
				var product_items = {
					'id': orderlines.models[i].product.id,
					'quantity': orderlines.models[i].quantity,
					'uom_id': orderlines.models[i].product.uom_id[0],
					'price': orderlines.models[i].price,
					'discount': orderlines.models[i].discount,
				};
				pos_product_list.push({'product': product_items });
			}
			
			self.rpc({
				model: 'pos.create.sales.order',
				method: 'create_sales_order',
				args: [partner_id, partner_id, pos_product_list, cashier_id],
			}).then(function(output) {
				alert('Sales Order Created !!!!');
				if(orderlines.length > 0){
					for (var line in orderlines)
					{
						order.remove_orderline(order.get_orderlines());
					}
				}
				order.set_client(false);
			});
		}
	}

	CreateSalesOrderButton.template = 'CreateSalesOrderButton';
	ProductScreen.addControlButton({
		component: CreateSalesOrderButton,
		condition: function() {
			return true;
		},
	});
	Registries.Component.add(CreateSalesOrderButton);
	return CreateSalesOrderButton;
});