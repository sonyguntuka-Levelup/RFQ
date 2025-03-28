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
    expect(quoteResponse).toHaveProperty('quoteId');
    expect(quoteResponse).toHaveProperty('expiresAt');
    expect(quoteResponse).toHaveProperty('quoteStatus');
    expect(quoteResponse).toHaveProperty('pair');
    expect(quoteResponse).toHaveProperty('side');

    // Ensure quoteId is a valid UUID
    expect(quoteResponse.quoteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    // Print how many seconds the quote is valid after generation
    const requestedAt = new Date(quoteResponse.requestedAt);
    const expiresAt = new Date(quoteResponse.expiresAt);
    const timeDiff = (expiresAt.getTime() - requestedAt.getTime()) / 1000;
    console.log('The quote expires in: ', timeDiff);
  

    // Ensure quantities are valid positive numbers
    expect(Number(quoteResponse.deliverQuantity)).toBeGreaterThan(0);
    expect(Number(quoteResponse.receiveQuantity)).toBeGreaterThan(0);

    expect(['AWAITING_RESPONSE', 'FILLED', 'EXPIRED']).toContain(quoteResponse.quoteStatus); //I am assuming these are the statuses

  });

  test('Should execute a valid quote successfully with retries', async () => {
    test.setTimeout(60000); // Set timeout for this specific test (60s)
    
    const maxRetries = 3;
    let attempt = 0;
    let executeResponse;
    let lastError;
  
    // Ensure we are using a valid (non-expired) quote
    const validQuote = await getValidQuote();
  
    while (attempt < maxRetries) {
      try {
        console.log(`Attempt ${attempt + 1}: Executing quote...`);
        executeResponse = await rfqApi.executeQuote(authToken, validQuote.quoteId);
  
        // Assert that the response contains an orderId (successful execution)
        expect(executeResponse).toHaveProperty('orderId');
        
        console.log('Execute Response:', executeResponse);
        return; // Exit the loop on success
  
      } catch (error) {
        lastError = error;
      
        if (error instanceof Error) {
          console.error(`Error executing quote on attempt ${attempt + 1}:`, error.message);
          
          if (error.message.includes('Internal Server Error') && attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1))); // Exponential backoff
            attempt++;
          } else {
            throw new Error(`Failed to execute quote after ${maxRetries} attempts: ${error.message}`);
          }
        } else {
          console.error(`Unknown error encountered:`, error);
          throw new Error(`Unknown error occurred while executing quote`);
        }
      }
    }
  });

  test('Should verify executed quote appears in the list of orders', async () => {
    try {
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
    } catch (error) {
      console.error('Test failed with error:', error);
      throw error; // Rethrow the error so the test fails properly
    }
  });  
});
