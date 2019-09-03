import React from 'react'
import jsonObject from './testObject.json'
import './App.css'
import { Dropbox } from 'dropbox'
import fetch from 'isomorphic-fetch'
import QueryString from 'query-string'

const dropboxClient = new Dropbox({ clientId: 'oa2fya90aycp41e', fetch })

const containerStyle = {
  paddingBottom: '100px'
}

const textAreaStyle = {
  fontSize: '1em',
  resize: 'none',
  overflow: 'hidden',
  width: '100%',
  minHeight: '6em',
}

const hiddenLabelStyle = {
  position: 'absolute',
  top: '-1000px'
}

const buttonStyle = {
  fontWeight: '500',
  padding: '0.25em 0.5em',
  border: '1px solid #bababa'
}

const Button = ({ text, ...rest }) => (<button {...rest} style={buttonStyle}>{text}</button>)

const readUploadedFileAsText = async (inputFile) => {
  const temporaryFileReader = new FileReader()

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort()
      reject(new DOMException('Problem parsing input file.'))
    }

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result)
    }
    temporaryFileReader.readAsText(inputFile)
  })
}

const prettifyJson = (json) => JSON.stringify(json, null, 2)

class App extends React.Component {
  constructor (props) {
    super(props)
    this.textAreaRef = React.createRef()
    this.state = {
      json: jsonObject,
      editableJson: JSON.stringify(jsonObject, null, 2),
      fileName: 'fileName',
      dropboxAuthValues: {},
      messages: {},
      errors: {},
    }

    this.loginToDropbox = this.loginToDropbox.bind(this)
    this.getSpaceUsage = this.getSpaceUsage.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleJsonChange = this.handleJsonChange.bind(this)
    this.formatJson = this.formatJson.bind(this)
    this.saveJsonToLocal = this.saveJsonToLocal.bind(this)
    this.loadJsonFromLocal = this.loadJsonFromLocal.bind(this)
    this.uploadJsonToDropbox = this.uploadJsonToDropbox.bind(this)
    this.downloadJsonFromDropbox = this.downloadJsonFromDropbox.bind(this)
  }

  componentDidMount () {
    this.adjustTextAreaHeight()
    try {
      const dropboxAuthValues = QueryString.parse(window.location.hash)
      if (dropboxAuthValues.access_token) {
        dropboxClient.setAccessToken(dropboxAuthValues.access_token)
        this.setState({ dropboxAuthValues })
        this.setMessage('Dropbox successfully authorized!', 'auth')
        window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}`)
      }
    } catch (error) {
      this.setError(error.message, 'auth')
    }
  }

  componentDidUpdate () {
    this.adjustTextAreaHeight()
  }

  handleChange (event) {
    this.setState({ [event.target.name]: event.target.value })
  }

  handleJsonChange (event) {
    this.setState({ [event.target.name]: event.target.value, messages: {}, errors: {} })
  }

  setMessage (message, name, stateObjectName = 'messages') {
    this.setState((oldState) => {
      const messages = { ...oldState[stateObjectName] }
      messages[name || 'other'] = message
      const newState = {}
      newState[stateObjectName] = messages
      return newState
    })
  }

  setError (error, name) {
    this.setMessage(error, name, 'errors')
  }

  clearMessages () {
    this.setState({ messages: {}, errors: {} })
  }

  adjustTextAreaHeight () {
    if (this.textAreaRef) {
      const { current } = this.textAreaRef
      if (current && current.style) {
        current.style.height = 'inherit'
        current.style.height = `${current.scrollHeight}px`
      }
    }
  }

  formatJson () {
    this.clearMessages()
    const { editableJson } = this.state
    let formattedJson
    try {
      formattedJson = prettifyJson(JSON.parse(editableJson))
      this.setMessage('Successfully formatted JSON!', 'format')
    } catch (error) {
      this.setError('Error formatting the JSON.', 'format')
    }
    this.setState({ editableJson: formattedJson || editableJson })
    return !!formattedJson
  }

  loginToDropbox () {
    const dropboxAuthUrl = dropboxClient.getAuthenticationUrl(window.location.href)
    window.location.href = dropboxAuthUrl
  }

  async getSpaceUsage () {
    this.clearMessages()
    try {
      const response = await dropboxClient.usersGetSpaceUsage()
      this.setState({ spaceUsage: response })
      this.setMessage('Retrieved space usage information!', 'space')
    } catch (error) {
      const message = error.message || 'Not authenticated with Dropbox.'
      this.setError(message, 'space')
    }
  }

  saveJsonToLocal () {
    if (this.formatJson()) {
      const { editableJson, fileName } = this.state
      const encodedString = encodeURIComponent(JSON.stringify(JSON.parse(editableJson)))
      const data = `data:text/json;charset=utf-8,${encodedString}`
      const anchorNode = document.createElement('a')
      anchorNode.setAttribute('href', data)
      anchorNode.setAttribute('download', `${fileName}.json`)
      document.body.appendChild(anchorNode) // required for firefox
      anchorNode.click()
      anchorNode.remove()
    } else {
      this.setError('JSON is not in proper format. Please correct the format and try again.', 'save')
    }
  }

  async parseFile (file) {
    try {
      const fileText = await readUploadedFileAsText(file)
      const json = JSON.parse(fileText)
      this.setState({ editableJson: prettifyJson(json) })
      this.setMessage('Data updated.', 'format')
    } catch (error) {
      this.setError('Failed to parse file.', 'format')
    }
  }

  loadJsonFromLocal (event) {
    this.clearMessages()
    const file = event.target.files[0]
    this.parseFile(file)
  }

  async uploadJsonToDropbox () {
    if (this.formatJson()) {
      const { editableJson, fileName } = this.state

      const formattedJson = JSON.stringify(JSON.parse(editableJson))
      const params = {
        path: `/${fileName}.json`,
        contents: formattedJson,
        mode: 'overwrite',
      }

      try {
        await dropboxClient.filesUpload(params)
        this.setMessage(`Uploaded file ${fileName}.json successfully!`, 'upload')
      } catch (error) {
        this.setError(`Failed to upload file ${fileName}.json`, 'upload')
      }
    } else {
      this.setError('JSON is not in proper format. Please correct the format and try again.', 'upload')
    }
  }

  async downloadJsonFromDropbox () {
    this.clearMessages()
    const { fileName } = this.state
    const params = { path: `/${fileName}.json` }
    let response

    try {
      response = await dropboxClient.filesDownload(params)
      this.setMessage(`Downloaded file ${fileName}.json successfully!`, 'download')
      this.parseFile(response.fileBlob)
    } catch (error) {
      this.setError(`Failed to download file ${fileName}.json`, 'download')
    }
  }

  renderMessage (message, styleOverrides = {}) {
    if (message) {
      const styles = {
        backgroundColor: 'green',
        color: 'white',
        padding: '0.5em',
        ...styleOverrides
      }
      return (
        <div style={styles}>{message}</div>
      )
    }
  }

  renderError (error, styleOverrides = {}) {
    return this.renderMessage(error, { backgroundColor: 'red', ...styleOverrides })
  }

  renderAuthorized () {
    if (this.state.dropboxAuthValues.access_token) {
      const { fileName, messages, errors } = this.state
      return (
        <>
          <h2>Step 4: Upload</h2>
          <p>This will upload the above JSON contents to Dropbox with the specified filename.</p>
          <div>
            <input name="fileName" value={fileName} onChange={this.handleChange} /><span>.json</span>
          </div>
          <Button onClick={this.uploadJsonToDropbox} text='Upload' />
          {this.renderMessage(messages.upload)}
          {this.renderError(errors.upload)}

          <h2>Step 5: Download</h2>
          <p>This will download the specified JSON file from Dropbox and display it above.</p>
          <div>
            <input name="fileName" value={fileName} onChange={this.handleChange} /><span>.json</span>
          </div>
          <Button onClick={this.downloadJsonFromDropbox} text='Download' />
          {this.renderMessage(messages.download)}
          {this.renderError(errors.download)}
        </>
      )
    }
  }

  render () {
    const { editableJson, spaceUsage, messages, errors } = this.state
    return (
      <div className="container-fluid" style={containerStyle}>
        <h1>Dropbox API Test</h1>
        {this.renderError(errors.other)}

        <h2>Step 1: Auth</h2>
        <p>This will navigate to Dropbox to authenticate and get a token for this app.</p>
        <Button onClick={this.loginToDropbox} text="Login to Dropbox" />
        {this.renderMessage(messages.auth)}
        {this.renderError(errors.auth)}

        <h2>Step 2: Test</h2>
        <p>This will use the Dropbox token to see how much space is available.</p>
        <Button onClick={this.getSpaceUsage} text='Get Space Usage' />
        {this.renderMessage(messages.space)}
        {this.renderError(errors.space)}
        <pre>{JSON.stringify(spaceUsage, null, 2)}</pre>

        <h2>Step 3: Data</h2>
        <p>This is a place to edit a JSON object to save in Dropbox. You can save/load this object to/from a local file.</p>
        <textarea ref={this.textAreaRef} name="editableJson" value={editableJson} style={textAreaStyle} onChange={this.handleJsonChange} />
        <Button onClick={this.formatJson} text='Format' />
        <Button onClick={this.saveJsonToLocal} text='Save to Local' />
        <label style={buttonStyle}>
          <input type="file" style={hiddenLabelStyle} onChange={this.loadJsonFromLocal} />
          <span>Load From Local</span>
        </label>
        {this.renderMessage(messages.format)}
        {this.renderError(errors.format)}
        {this.renderError(errors.save)}
        {this.renderError(errors.load)}

        {this.renderAuthorized()}
      </div>
    )
  }
}

export default App
