## Server Setup
To run the project, do the following:
1. `npm install` to install dependencies.
2. Populate your `.env` file, following the guide of `.env.example`.
3. Install MariaDB Distribution 11.10.13.
5. Run the following commands to create your users:
    ```sql
    create user <PRIVILEGED_DB_USER>@localhost IDENTIFIED BY <PRIVILEGED_DB_USER_PASSWORD>;
    create user <CLIENT_DB_USER>@localhost IDENTIFIED BY <CLIENT_DB_USER_PASSWORD>;
    grant all privileges on comp4537_lab5.* to <PRIVILEGED_DB_USER>@localhost with grant option;
    ```
6. Start the server.
    ```shell
    npm start
    ```