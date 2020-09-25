# foodeze
An app to make running a loal food-buying group easy.

Eating well and living mindfully leads away from supermarkets with their long supply chains, squeezing of farmers and chasing of shareholder profits toward small groups of people cooperating to buy from trusted farmers in their area. To source organic food locally and reliably is quite complex especially on the scale of 10 - 30 members of a typical food group. 

Foodeze is intended to take away much of the pain of organising custom boxes to members on a regular basis. Currently in development!

## requirements
An app to do it all... 
* web pages to explain procedures and encourage people to join
* wizard to wrangle availability lists from various suppliers
* shopping cart to enable custom online orders for members
* messaging and chat to notify the right members when to order, what extras they can snaffle, or resolve issues
* managemtent for rostering of packers, entering finances and other jobs
* accounting for tracking member invoices and balances, and integrating with external accounting package
* reporting to track all moving parts to show final position at any moment
* sophisticated interface to show members, stock, accounts and orders sliced and diced many different ways
... for multiple groups!

## major features
* supplier availability API to import various formats of available items into a rich native format allowing searching on many attributes, eg
 * name
 * description
 * quality
 * size
 * color
* data storage server and client-side
  * suppliers 
  * stock
  * members
  * invoices, payments, balances
  * sales, expenses, *assets* etc
 * scheduling of order cycle
  * making available
  * reminder to order
  * order window
  * initial orders sent to members
  * supplier orders entered
  * notification of items extra or missing
  * printouts of member orders, delivery runsheet
  * adjustments after packing
  * invoices sent to members
  * member payments entered
  * order cycle audit
 * admin functionality
  * screens listing stock, members, orders, invoices, reports
  * query filter mechanism for swift search/update/delete/substitute of items or other
  * prepare PDF versions of packing slips, delivery sheets, extras sheet to send via email
 * notifications
  * ability to send scheduled, templated notifications to all or a subset of all members (eg all members who ordered, this current packing team)
  * integrate with external messaging/chat service
 * accounting
  * once member order has progressed from initial order to revised order to adjusted order to invoice to revised invoice... capture final invoice as PDF, save some metadata & iscard all other order data.
  * track metadata (totals per order cycle) for the following:
   * total sales 
   * cost of sales (including each supplier's invoice total)
   * expenses (any non-supplier outgoing fees)
   * assets (vehicle value, stock)
   * liabilities (membership fees etc)
   * current balance (bank account)
   * current position (if food group wound up business today)
   
  


