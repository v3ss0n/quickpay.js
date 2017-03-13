# Quickpay.js

Quickpay.js allows you to instantly and easily add a checkout form to your website to allow your customers to make payments through PAYSBUY. It makes use of [Paysbuy.js](https://github.com/paysbuy/paysbuy.js), although you do not need to use that directly or include it in your site.



## How to use

To add a Quickpay checkout form to your page, you only need add the script file to your site:

https://domain/and/path/to/quickpay.js or minified at https://domain/and/path/to/quickpay.min.js 


Then add a small amount of code or markup to your page. Please note that the method of including the Quickpay javascript is slightly different if you are adding the checkout using HTML markup (see below)



### Via Javascript API

First, set up a checkout:

```javascript
let checkout = Paysbuy.QuickPay.configure({
  key: 'pub_hrkK7qM6Can2vCsolp',
  onTokenReceived: checkoutDone,
  title: 'My Widget Shop',
  image: 'https://my.domain/img/shop.png',
  description: '2 x iPhone 7 Plus (฿123.00)',
  currency: 'THB',
  amount: 123,
  payMethods: 'wavemoney,card'
});
```

Then launch the checkout, optionally passing in parameters to override those you configured originally:

```javascript
checkout.open({
  amount: 300
});
```

When the checkout process completes successfully, the handler function specified in `onTokenReceived` will be called. It will receive the token from the tokenization process. You can then post this to your server to [make a payment](https://docs.paysbuy.com/paypi/#create-a-payment).

```javascript
function checkoutDone(result) {
  alert('Token is: '+result.token);
}
```

More detailed information on the Javascript API can be found below



### Via HTML

It is possible to insert a button to launch a checkout popup directly into an existing form. This is achieved using the following HTML:

```html
<form id="f1" method="GET" action="/my_payment_code">
  <script src="https://domain/and/path/to/quickpay.min.js" class="btn" data-qp-image="https://my.domain/img/shop.png" data-qp-key="pub_hrkK7qM6Can2vCsolp" data-qp-title="My Widget Shop" data-qp-description="2 Widgets @ ฿1,500" data-qp-amount=3000></script>
</form>
```

The created `button` element will appear at the point in the HTML just after the script tag. Any classes applied to the script tag will be copied to the button. Upon the successful completion of the checkout process, the containing form of the button will be submitted. The token will be included in the posted data. The auto submission can be blocked by setting the `data-qp-no-submit` attribute to "false". The text on the button is specified using the `data-qp-button-label` attribute.

All other Quickpay config parameters listed in the "API Details" section may be specified by using attributes - simply convert the parameter name to the corresponding attribute name e.g. the `submitLabel` parameter will be specified using the `data-qp-submit-label` attribute.
 



## API Details

### Config Parameters

Optional parameters are shown in square brackets.

Parameter         | Default value    | Description
----------------- |:----------------:| --------------------
key               |                  | Public API key for the PAYSBUY API
[onTokenReceived] |                  | Handler function to process successful tokenization result
[image]           |                  | URL of image to show on checkout form (square image recommended - 74x74 or larger)
[locale]          | `'en-GB'`        | Sets the locale for the checkout - will affect the display language (when i18n is done!)
[submitLabel]     | `'Pay {amount}'` | Label for 'Pay' button on checkout popup. `{amount}` will be replaced by a formatted currency string using the specified amount
[title]           |                  | Title for checkout popup (often the shop/store name)
[description]     |                  | A description of what is being paid for
amount            |                  | Amount to be paid
[currency]        | `'THB'`          | ISO 4217 currency code
[showEmail]       | `false`          | Show/hide the email field (true/false/0/1) - set to a string to pre-fill the field. Applies to credit card payment method only
[showPhone]       | `false`          | Show/hide the phone number field (true/false/0/1) - set to a string to pre-fill the field. Applies to credit card payment method only
[showName]        | `true`           | Show/hide the name field (true/false/0/1) - set to a string to pre-fill the field. Applies to credit card payment method only
[payMethods]      | `'card'`         | Comma separated list of payment methods that will be available on the checkout form. The ordering will be respected
[eventContainer]  | `document`       | DOM element to receive Quickpay events
[containerId]     |                  | If specified, the html element with the given id will be used as a container for the QuickPay form. In this case, you will not need to call the `open` method as the form is now part of the current page rather than a popup
[css]             |                  | If specified, the given CSS will be injected into the checkout page. This gives you full flexibility to control the way it looks
[cssImport]       | `false`          | If set to `true`, QuickPay will look for the first stylesheet in the page that has the title attribute set to `quickpay` and, if found, will inject this CSS into the checkout page. This will override the `css` parameter.



### Methods

`Paysbuy.Quickpay.configure`
Configures and returns a checkout object - pass in an object containing required parameters

`CheckoutObject.open`
Displays the quickpay checkout popup - optionally pass in a parameters object to override the initial parameters from _configure()_


### Events

Events are emitted via a DOM object. By default this is the `document` itself, but this can be changed using the `eventContainer` parameter. Respond to these events as follows:

```javascript
document.on(Paysbuy.QuickPay.QP_CLOSEMESSAGE, checkoutCloseHandler);
```

Event            | Description
---------------- | ------------------------------------
QP_CLOSE         | User closed the checkout manually
QP_TOKENIZESTART | Tokenization has started
QP_TOKENIZEEND   | Tokenization is complete
QP_SHOW          | Checkout has been shown
QP_HIDE          | Checkout has been hidden (after successful payment)
QP_TOKENRECEIVED | Token has been received from PAYSBUY (this only fires from checkouts created in HTML). The token will be in `event.originalEvent.detail`