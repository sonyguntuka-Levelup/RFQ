// src/pages/rfqApi.ts
import { APIRequestContext, expect } from '@playwright/test';
import { API_CONFIG } from '../config';

export default class RFQApi {
  private authToken: string = '';
  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.apiContext = apiContext;
  }

  // Function to get auth token
  async getAuthToken(): Promise<string> {
    const response = await this.apiContext.post(API_CONFIG.TOKEN_URL, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: `grant_type=client_credentials&client_id=${API_CONFIG.CLIENT_ID}&client_secret=${API_CONFIG.CLIENT_SECRET}`,
    });

    const data = await response.json();
    return data.access_token;
  }

//Create Quote
  async createQuote(authToken: string): Promise<any> {
    const response = await this.apiContext.post(`${API_CONFIG.BASE_URL}/api/v1/quotes`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        accountId: "ca3968d2-36e5-4bf0-b6ca-2eba9a7a2a94", // Fill in the accountId if needed
        pair: "BTC-USD",
        side: "BUY",
        deliverQuantity: "103.06",
        clientFeeRate: "30"
      },
    });
  
    // Check if response is successful
    if (!response.ok()) {
      const errorBody = await response.text();  // Log the response body
      console.error('Error Body:', errorBody);  // Log full response for debugging
      throw new Error(`Failed to create quote: ${response.statusText()}`);
    }
  
    return response.json();
  }
  
  // Function to execute a quote (POST /orders)
  async executeQuote(authToken: string, quoteId: string) {
    const payload = { quoteId };
  
    try {
      const response = await this.apiContext.post(`${API_CONFIG.BASE_URL}/api/v1/orders`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });
  
      if (!response.ok()) {
        const errorBody = await response.text();
        console.error('Error Body:', errorBody);
        throw new Error(`Failed to execute quote: ${response.statusText()}`);
      }
  
      const responseData = await response.json();
      console.log("Quote executed successfully:", responseData);
      return responseData;
    } catch (error) {
      console.error("Error executing quote:", error);
      throw new Error(`Error executing quote: ${error}`);
    }
  }
  // Function to get list of orders (GET /orders)
  async getOrders(authToken: string): Promise<any> {
    const response = await this.apiContext.get(`${API_CONFIG.BASE_URL}/api/v1/orders`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const errorBody = await response.text();
      console.error('Error Body:', errorBody);
      throw new Error(`Failed to fetch orders: ${response.statusText()}`);
    }

    return response.json();
  }
}