Authentication System API
This is an Authentication System API developed using Node.js, Express.js, and MongoDB. It provides endpoints for user registration, login, password management (forget password and reset password), account deletion, and profile updating.

Features
Register: Users can create a new account by providing their first name, last name, email, and password. Upon successful registration, the user's information is stored securely in the database.

Login: Registered users can log in to their accounts using their email and password. Upon successful authentication, the API generates a JSON Web Token (JWT) which is used to authenticate subsequent requests.

Forget Password: Users who forget their password can initiate a password reset process by providing their email address. An email containing a reset link is sent to the user's email address, allowing them to reset their password securely.

Reset Password: Users can reset their password by following the reset link sent to their email address. They can then set a new password securely, providing them with continued access to their account.

Delete Account: Users can delete their account, removing all associated data from the system. This action is irreversible and permanently deletes all user information.

Update Profile: Users can update their profile information, including their first name, last name, email, and password. This allows users to keep their account details up to date.

Technologies Used
Node.js: A JavaScript runtime for building scalable and high-performance applications.
Express.js: A web application framework for Node.js that provides robust routing, middleware support, and simplified handling of HTTP requests.
MongoDB: A NoSQL database used to store user information securely.
JSON Web Tokens (JWT): Used for user authentication and authorization, providing a secure way to transmit information between parties.
