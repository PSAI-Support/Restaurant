# -*- coding: utf-8 -*-
{
    "name": "Universal Appointments: Gantt",
    "version": "15.0.1.0.1",
    "category": "Extra Tools",
    "author": "faOtools",
    "website": "https://faotools.com/apps/15.0/universal-appointments-gantt-676",
    "license": "Other proprietary",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": [
        "business_appointment",
        "web_gantt"
    ],
    "data": [
        "views/business_appointment.xml",
        "security/ir.model.access.csv",
        "data/data.xml"
    ],
    "assets": {},
    "demo": [
        
    ],
    "external_dependencies": {},
    "summary": "The extension to the Universal Appointments app to control reservations on the Odoo Enterprise Gantt view",
    "description": """
For the full details look at static/description/index.html

* Features * 




#odootools_proprietary

    """,
    "images": [
        "static/description/main.png"
    ],
    "price": "0.0",
    "currency": "EUR",
    "live_test_url": "https://faotools.com/my/tickets/newticket?&url_app_id=145&ticket_version=15.0&ticket_license=enterpise&url_type_id=3",
}