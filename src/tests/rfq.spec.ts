// src/tests/rfq.spec.ts
import { test, expect, request, Browser, Page } from '@playwright/test';
import RFQApi from '../pages/rfqApi'; // Importing default class
import { API_CONFIG } from '../config';

test.describe('RFQ API Tests', () => {
  let rfqApi: RFQApi;
  let authToken: string;
  let quoteResponse: any;

  // Set up: Before running all tests, get the auth token
  test.beforeAll(async () => {
    const apiContext = await request.newContext();  // Create a new API context
    rfqApi = new RFQApi(apiContext);
    authToken = await rfqApi.getAuthToken();  // Get the auth token
    console.log("Auth Token:", authToken);
  });

  // Helper function to check if quote is expired
  const isQuoteExpired = (expiresAt: string): boolean => {
    const quoteExpirationDate = new Date(expiresAt);
    const currentDate = new Date();
    return currentDate > quoteExpirationDate;  // If current time is greater than expiration time, it's expired
  };

  // Create a new quote if the old one is expired
  const getValidQuote = async (): Promise<any> => {
    if (!quoteResponse || isQuoteExpired(quoteResponse.expiresAt)) {
      // Quote is expired or does not exist, so create a new one
      console.log('Quote is expired or does not exist, creating a new one...');
      quoteResponse = await rfqApi.createQuote(authToken);  // Create new quote
      console.log('New Quote Created:', quoteResponse);
    } else {
      console.log('Quote is still valid, using existing one...');
    }
    return quoteResponse;
  };

  test('Should create a quote successfully', async () => {
    const quoteResponse = await rfqApi.createQuote(authToken);  // Use the auth token
    console.log('Quote Response:', quoteResponse);
    expect(quoteResponse).toHaveProperty('quoteId');  // Example check
  });

  test('Should execute a valid quote successfully', async () => {
    test.setTimeout(60000); // Set timeout for this specific test (60s)
  
    // Ensure we are using a valid (non-expired) quote
    const validQuote = await getValidQuote();
  
    // Execute quote with the valid quoteId and authToken
    const executeResponse = await rfqApi.executeQuote(authToken, validQuote.quoteId);
  
    // Log the response to help with debugging
    console.log('Execute Response:', executeResponse);
  
    // Assert that the response contains an orderId (successful execution)
    expect(executeResponse).toHaveProperty('orderId');
  });
  
  test('Should execute a valid quote successfully with API mocking', async ({ page, browser }) => {
    // Create a new API context
    const apiContext = await request.newContext();
    const newPage: Page = await browser.newPage();
  
    // Mock the /api/v1/orders endpoint
    await newPage.route('**/api/v1/orders', async (route) => {
      // Check if the request contains quoteId in the payload
      const requestPayload = await route.request().postData();
      const payload = JSON.parse(requestPayload || '{}');
  
      if (payload.quoteId) {
        console.log(`Received quoteId: ${payload.quoteId}`);
        
        // Respond with the mocked response
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            order: {
              orderId: "123e4567-e89b-12d3-a456-426614174000",
              accountId: "123e4567-e89b-12d3-a456-426614174000",
              orderStatus: "PLACED",
              side: "BUY",
              pair: "BTC-USD",
              strategy: "RFQ",
              orderPrice: "52100.00",
              orderQuantity: "1.00",
              fillQuantity: "1.00",
              fillPrice: "52100.00",
              fillPercentage: "100",
              clientFeeRate: "10",
              providerFeeRate: "10",
              placedAt: "2025-03-26T19:31:53.733Z",
              completedAt: null,
              clientReference: "text"
            },
            executions: [
              {
                executionId: "123e4567-e89b-12d3-a456-426614174000",
                orderId: "123e4567-e89b-12d3-a456-426614174000",
                accountId: "123e4567-e89b-12d3-a456-426614174000",
                executedAt: "2025-03-26T19:31:53.733Z",
                pair: "BTC-USD",
                side: "BUY",
                deliverCurrency: "BTC",
                deliverQuantity: "1.00",
                receiveCurrency: "USD",
                receiveQuantity: "52100.00",
                price: "52100.00",
                baseQuantity: "0.0016",
                quoteQuantity: "10.74",
                clientFeeRate: "10",
                providerFeeRate: "10",
                clientFeeQuantity: "52.10",
                providerFeeQuantity: "52.10",
                feeCurrency: "USD",
                executionStatus: "TRADE_EXECUTED",
                tradeDate: "2025-03-26",
                valueDate: "2025-03-26",
                confirmedAt: "2025-03-26T19:31:53.733Z",
                clientReference: "text",
                tradeTaxRate: "5",
                clientTaxQuantity: "2.61",
                providerTaxQuantity: "2.61"
              }
            ]
          }),
          contentType: 'application/json',
        });
      } else {
        // If no quoteId is present in the payload, reject the route
        await route.abort();
      }
    });

    const validQuote = await rfqApi.createQuote(authToken);  // Create a new quote dynamically
    const dynamicQuoteId = validQuote.quoteId;  // Get the quoteId from the created quote
    const dynamicAuthToken = authToken;  // Use the dynamically fetched auth token
  
    // Send a POST request with the quoteId in the payload
    const response = await newPage.request.post(`${API_CONFIG.BASE_URL}/api/v1/orders`, {
      data: {
        quoteId: dynamicQuoteId,  // Dynamic quoteId
      },
      headers: { 'Authorization': `Bearer ${dynamicAuthToken}` },  // Dynamic auth token
    });
  
    // Get the JSON response
    const responseData = await response.json();
    console.log('Mocked Response:', responseData);
  
    // Assertions to verify that the mock response is as expected
    expect(responseData).toHaveProperty('order.orderId', '123e4567-e89b-12d3-a456-426614174000');
    expect(responseData).toHaveProperty('order.orderStatus', 'PLACED');
    expect(responseData.executions[0]).toHaveProperty('executionId', '123e4567-e89b-12d3-a456-426614174000');
  });

  /*test('Should verify executed quote appears in the list of orders', async () => {
    const quoteResponse = await rfqApi.createQuote(authToken);
    console.log('Quote Created:', quoteResponse);

    const quoteId = quoteResponse.quoteId;
    expect(quoteId).toBeDefined();

    const executionResponse = await rfqApi.executeQuote(authToken, quoteId);
    console.log('Execution Response:', executionResponse);

    const orderId = executionResponse.orderId;
    expect(orderId).toBeDefined(); // Ensure orderId exists

    // Fetch orders and check if the executed quote appears in the list
    const ordersResponse = await rfqApi.getOrders(authToken);
    console.log('Orders Response:', ordersResponse);

    const orderExists = ordersResponse.orders.some((order: any) => order.orderId === orderId);
    expect(orderExists).toBeTruthy();
  });*/
});
