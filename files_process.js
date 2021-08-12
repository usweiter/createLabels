// require('update-electron-app')()
const {dialog, ipcRenderer} = require('electron').remote;
const remote = require('electron').remote;
const fs = require('fs')
const path = require('path')
var xml_parser = require('xml-js')
var QRCode = require('qrcode')
var html2image = require('html-to-image')
var bmp_generator = require('bmp-js')


var production = false;
var label_path = '\\\\192.168.48.25\\raskroi\\label';
var raskroi_path = '\\\\192.168.48.25\\raskroi';

function closeNotification(notification){
  notification.classList.add('d-none')
}
function restartApp(){
  ipcRenderer.send('restart_app')
}

const notification = document.getElementById('notification')
const notification_message = notification.querySelector('.notification_message')
const notification_restart = notification.querySelector('.notification_restart_btn')
const notification_close = notification.querySelector('.notification_close_btn')

notification_restart.addEventListener('click', restartApp())
notification_close.addEventListener('click', closeNotification())

ipcRenderer.on('update_available', ()=>{
  ipcRenderer.removeAllListeners('update_available')
  notification_message.innerText = 'Загрузка обновления...'
  notification.classList.remove('d-none')
})

ipcRenderer.on('update_downloaded', ()=>{
  ipcRenderer.removeAllListeners('update_downloaded')
  notification_message.innerText = 'Обновление загружено. Оно будет установлено после перезагрузки программы'
  notification_restart.classList.remove('d-none')
  notification_close.classList.remove('d-none')
})

document.getElementById('select_file').addEventListener('click', ()=>{
      dialog.showOpenDialog({
        properties:['openFile', 'multiSelections'],
      })
      .then((result)=>{
        // <Для индикатора загрузки>
        var aLLDetails = 0;     //Счетчик Всех деталей 
        var countDetails = 0; // Счетчик сохраненных деталей
        result.filePaths.forEach((file_path)=>{
          var data = fs.readFileSync(file_path,"UTF-8")
          var json = xml_parser.xml2json(data, {compact: false, spaces: 4})
          var json_specification = JSON.parse(json)

          json_specification.elements[0].elements.forEach((item)=>{ //Подсчитать количество деталей
            if(item.name === 'Part'){
              aLLDetails += 1
              return 
            }
          })
        })
        // </Для индикатора загрузки>

        result.filePaths.forEach((file_path)=>{
          var file_path_parts = file_path.split('\\')
          var file_name = file_path_parts[file_path_parts.length-1]
          var dir_name = file_name.replace(/ /g, '_').split('.xml')[0].trim()

          var data = fs.readFileSync(file_path,"UTF-8")
          var json = xml_parser.xml2json(data, {compact: false, spaces: 4})
          var json_specification = JSON.parse(json)

          if(production == true){
            fs.mkdirSync(path.join(label_path, dir_name), {recursive:true}, (err)=>{
              if(err) return console.log(err)
            })
          }else{
            fs.mkdirSync(path.join('./Raskroi/label/', dir_name), {recursive:true}, (err)=>{
              if(err) return console.log(err)
            })
          }

          var all_labels = document.getElementById('all_labels')
          var details_quantity = 0
          var order_id = json_specification.elements[0].attributes.Code

          json_specification.elements[0].elements.forEach((item)=>{ //Подсчитать количество деталей
            if(item.name === 'Part'){
              details_quantity += 1
              return 
            }
          })

          json_specification.elements[0].elements.forEach((detail)=>{ // Работа с каждой деталью
            if(detail.name === 'Part'){
              detail.attributes.Draw_4 = '.\\label\\' + dir_name + '\\label' + detail.attributes.id + '.bmp'
              // detailObject.order_id = order_id
              // detailObject.detail_id = detail.attributes.Code.slice(2)

              // detailObject.id = detail.attributes.id

              // detailObject.length = detail.attributes.L
              // detailObject.width = detail.attributes.W

              // Формирование шаблона
                // <FIRST ROW>
              var full_label = document.createElement('div')
              full_label.id = 'full_label_' + detail.attributes.id
              full_label.classList = 'full_label'
              all_labels.appendChild(full_label)
              
              var first_row = document.createElement('div')
              var second_row = document.createElement('div')
              var third_row = document.createElement('div')

              first_row.classList = 'detail_row'
              second_row.classList= 'detail_row'
              third_row.classList = 'detail_row'
              
              first_row = full_label.appendChild(first_row)
              second_row = full_label.appendChild(second_row)
              third_row = full_label.appendChild(third_row)
              
              first_row.innerHTML = '<div class="label_text"><div style="display:flex; justify-content:space-between;"><span>Номер заказа: </span><span style="font-family: Roboto-bold;">'+ json_specification.elements[0].attributes.Code +'</span></div><div style="display:flex; justify-content:space-between;"><span>Номер детали: </span><span style="font-family: Roboto-bold;">'+ detail.attributes["Code"].slice(2) +'</span></div></div>'
                // </FIRST ROW>

                // <SECOND ROW>
              var second_row__top = document.createElement('div')
              var second_row__bottom = document.createElement('div')
              second_row__top.classList = 'second_row__item'
              second_row__bottom.classList = 'second_row__item'
              
              second_row__top.innerHTML = '<span>Название детали: </span>'
              let detail_span = document.createElement('span')
              detail_span.innerHTML = '<span class="char_name">'+ detail.attributes.IDesc +'</span>'
              second_row__top.appendChild(detail_span)

              second_row__bottom.innerHTML = '<span>Материал: </span>'
              let material_span = document.createElement('span')
              material_span.innerHTML = '<span class="char_name">'+ detail.attributes.Material +'</span>'
              second_row__bottom.appendChild(material_span)

              var detail_counter = document.createElement('span')
              detail_counter.classList = 'char_name'
              detail_counter.innerHTML = 'Деталь: <span style="font-family: Roboto-bold;">'+ detail.attributes.id +'/' + details_quantity +'</span>'
              second_row__bottom.appendChild(detail_counter)

              var char_arr = [detail_span, material_span].forEach(element => {
                while(element.offsetWidth+600 > second_row.offsetWidth){
                  let font_size = window.getComputedStyle(element, null).getPropertyValue('font-size')
                  let material_font_size = parseInt(font_size)
                  element.style.fontSize = (material_font_size - 1) + 'px'
                }
              });

              second_row.appendChild(second_row__top)
              second_row.appendChild(second_row__bottom)
                // </SECOND ROW>

                // <THIRD ROW>
              var qrcode_div = document.createElement('div')
              qrcode_div.id = 'qrcode_' + detail.attributes.id
              third_row.appendChild(qrcode_div)

              var edge = document.createElement('div')
              edge.innerHTML = '<div style="position:absolute; left:50%; transform: translateX(-50%); top:-40px; width:100%;"><span style="position:absolute; left:80px; white-space:nowrap;">Длина: '+detail.attributes.L+'</span><span style="position:absolute; left:50%; transform: translateX(-50%);">X</span><span style="position:absolute; right:80px; white-space:nowrap;">Ширина: '+detail.attributes.W+'</span></div>'
              var edge_left_side = document.createElement('div')
              var edge_right_side = document.createElement('div')

              edge_right_side.setAttribute('style', 'width:45%; position:relative; display:flex; justify-content:center; align-items:center; height:100%; flex-direction:column; margin-left: 25px;')
              edge_left_side.setAttribute('style', 'width:45%; position:relative; display:flex; justify-content:center; align-items:center; height:100%; flex-direction:column; margin-right: 25px;')

              edge.appendChild(edge_left_side)
              edge.appendChild(edge_right_side)

              edge.classList = 'edge'
              third_row.appendChild(edge)

              if(detail.attributes.MatEdgeUp !== '' && detail.attributes.MatEdgeUp !== undefined){

                var edge_top = document.createElement('span')
                if(detail.attributes.ThicknessEdgeUp !== undefined){
                  var border_thickness = 'border-top: '+ Math.ceil(detail.attributes.ThicknessEdgeUp.replace(/,/g, '.'))*10 +'px #000 solid;'
                }else{
                  var border_thickness = 'border-top: 10px #000 solid;'
                }
                
                edge_top.innerText = detail.attributes.MatEdgeUp
                var style = border_thickness + 'margin-bottom:25px; top:0; position:absolute; left:0; text-align:center; width:100%;'
                edge_top.setAttribute('style', style)

                edge_left_side.appendChild(edge_top)
              }
              if(detail.attributes.MatEdgeR !== '' && detail.attributes.MatEdgeR !== undefined){
                var edge_right = document.createElement('span')

                if(detail.attributes.ThicknessEdgeR !== undefined){
                  var border_thickness = 'border-top: '+ Math.ceil(detail.attributes.ThicknessEdgeR.replace(/,/g, '.'))*10 +'px #000 solid;'
                }else{
                  var border_thickness = 'border-top: 10px #000 solid;'
                }
                
                var style = border_thickness + 'margin-bottom:25px; top:0; right:0; position:absolute; text-align:center; width:100%;'
                edge_right.setAttribute('style', style)
                
                edge_right.innerText = detail.attributes.MatEdgeR

                edge_right_side.appendChild(edge_right)
              }
              if(detail.attributes.MatEdgeLo !== '' && detail.attributes.MatEdgeLo !== undefined){
                var edge_bottom = document.createElement('span')

                if(detail.attributes.ThicknessEdgeLo !== undefined){
                  var border_thickness = 'border-bottom: '+ Math.ceil(detail.attributes.ThicknessEdgeLo.replace(/,/g, '.'))*10 +'px #000 solid;'
                }else{
                  var border_thickness = 'border-bottom:10px #000 solid;'
                }

                var style = border_thickness + 'margin-top:25px; bottom:0; left:0; position:absolute; text-align:center; width:100%;'
                edge_bottom.setAttribute('style', style)

                edge_bottom.innerText = detail.attributes.MatEdgeLo

                edge_left_side.appendChild(edge_bottom)
              }
              if(detail.attributes.MatEdgeL !== '' && detail.attributes.MatEdgeL !== undefined){
                var edge_left = document.createElement('span')

                if(detail.attributes.ThicknessEdgeL !== undefined){
                  var border_thickness = 'border-bottom: '+ Math.ceil(detail.attributes.ThicknessEdgeL.replace(/,/g, '.'))*10 +'px #000 solid;rotateZ(180deg);'
                }else{
                  var border_thickness = 'border-bottom: 10px #000 solid;rotateZ(180deg);'
                }
                
                var style = border_thickness + 'margin-top:25px; bottom:0; right:0; position:absolute; text-align:center; width:100%;'
                edge_left.setAttribute('style', style)

                edge_left.innerText = detail.attributes.MatEdgeL

                edge_right_side.appendChild(edge_left)
              }
              
                // </THIRD ROW>
              // </Формирование шаблона>

              // <Сохранение бирок>
                // <QR-код>
              var detailObject = { // Информация, закладываемая в QR-код
                'id':detail.attributes.id,
                'order_id':order_id,
                'detail_id':detail.attributes.Code.slice(2),
                'length':detail.attributes.L,
                'width':detail.attributes.W
              }
              var qrInfo = JSON.stringify(detailObject)

              var qrcode_canvas = document.createElement('canvas')
              qrcode_div.appendChild(qrcode_canvas)
                // </QR-код>

              QRCode.toCanvas(qrcode_canvas, qrInfo, {scale:7}).then(canv=>{
                html2image.toCanvas(full_label).then(function(canvas){
                  canvas = canvas.getContext("2d")
                  canvas = canvas.getImageData(0,0,1206,591).data

                  var bmpData = {
                    data:canvas,
                    width:1206,
                    height:591
                  }
                  var raw_data = bmp_generator.encode(bmpData)
                  
                  if(production == true){
                    fs.writeFileSync(path.join(label_path, dir_name) + '/label' + detail.attributes['id'] +'.bmp', raw_data.encoder.data)
                  }else{
                    fs.writeFileSync(path.join(__dirname, '/Raskroi/label/' + dir_name) + '/label' + detail.attributes['id'] +'.bmp', raw_data.encoder.data)
                  }

                  countDetails += 1
                  if(countDetails == aLLDetails){
                    remote.getCurrentWindow().close()
                  }
                })
              })
              // </Сохранение бирок>
            }// Конец if
            })// Конец перебора деталей

            if(production == true){
              var newXml = xml_parser.json2xml(JSON.stringify(json_specification), {compact: false, spaces: 4})
              fs.writeFileSync(path.join(raskroi_path) + '\\'+ file_name, newXml)
            }else{
              var newXml = xml_parser.json2xml(JSON.stringify(json_specification), {compact: false, spaces: 4})
              fs.writeFileSync(path.join(__dirname) + '\\Raskroi\\'+ file_name, newXml)
            }
        })//Конец перебора xml файлов
        
  })
}, false)