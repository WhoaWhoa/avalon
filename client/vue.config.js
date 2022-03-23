module.exports = {
  "outputDir" : "../server/dist",
  devServer: {
    proxy: 'http://localhost:8001'
  }
}
