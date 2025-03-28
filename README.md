# RFQ
 RFQ API Tests

**How to Run the Automation**

**Prerequisites**
Node.js 
Playwright installed globally or locally in the project
Required dependencies installed via npm install
Supported browsers: Chromium, Firefox, and WebKit

**Installation & Setup**
Clone the repository:
     git clone <repository-url>
     cd <project-directory>
     
**Install dependencies:**
     npm install
     Install Playwright browsers:
     npx playwright install
     
**Change config.ts file (if needed)**
Based on the environment you test the scenarios, make sure the API configuration is changed accordingly in this file.
     
**Running the Tests**
To execute the test suite, run:
     npx playwright test
To run a specific test file:
     npx playwright test src/tests/rfq.spec.ts
To generate an HTML report after the test execution:
     npx playwright test --reporter=html
To debug tests:
     npx playwright test --debug

**Challenges Faced and Solutions**

**Challenge 1: Handling Expired Quotes**
Issue:
The expiresAt field in the response determines whether the quote is still valid.
If an expired quote is used for order execution, the request fails.
The expiration time is exactly 15 seconds after the quote is created.
Solution:
Implemented a helper function isQuoteExpired(expiresAt: string) that checks whether the current time exceeds expiresAt.
Introduced getValidQuote() to fetch a new quote if the previous one is expired.
This function ensures that tests always use a valid quote without requiring manual intervention.

**Challenge 2: Server-side Error Preventing Order Creation in "Execute Quote" API**
Issue: The test fails because the POST /api/v1/orders API, which executes the quote, returns a 500 Internal Server Error due to a server-side issue. As a result, no order is created.
Mocking Attempt: Mocking the POST /api/v1/orders API was attempted to bypass the server error, but it couldn't generate a real order tied to the executed quote. Thus, when fetching orders with GET /api/v1/orders, no valid order exists to verify.
Impact: Since no order is created, the GET /api/v1/orders call returns an empty or incorrect list, causing the test to fail.
Next Steps: The issue requires resolving the server-side error to allow successful execution of quotes and order creation for the test to work.
Final Verdict: Test3 is dependent on Test 2. As there are issues with Test 2 not executing as expected. I was not able to execute Test3 in my environment. If you would like to try in any of your local working environments, I request you to please give it a try.

**Challenge 3: Debugging API Requests and Responses**
Issue:
The tests failed intermittently due to unexpected response structures.
Needed a way to log request payloads and API responses for debugging.
Solution:
Added console.log() statements to capture API request and response data.
Logged error responses in case of failures to quickly diagnose issues.

