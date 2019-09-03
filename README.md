# Dropbox Api Test

This is a proof-of-concept to save and retrieve JSON data using the Dropbox API. It allows a front-end app to backup its state to a user's Dropbox account rather than using a database.

It's currently hosted [here](https://raystroud.000webhostapp.com/dropbox-test/).

To deploy this app yourself, follow these steps:

1. Adjust the `homepage` in `package.json` to reflect your own hosted directory. It determines how `yarn build` will package the app for production.
2. Replace the Dropbox `clientId` in `App.js` with your own. Or not. It would work using mine (please be gentle).
3. Run `yarn build`, then upload the contents of the `build` folder to your web server.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).
