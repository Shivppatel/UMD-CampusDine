function createNotification(name, protein, fat, carbs, cholesterol, sodium) {
  // Checks to see if a macro pop-up is already showing if so remove it
  if (document.querySelector('#macro-popup')) {
    document.querySelector('#macro-popup').remove();
  }

  const notification = document.createElement('div');
  notification.classList.add('container', 'box', 'notification', 'is-link');
  notification.id = 'macro-popup'; // Adding Id to reference later in css for syling
  notification.innerHTML = `
  <button class="delete"></button>
  <p class="title is-size-4 has-text-centered">${name}</p>
  <div id="chartContainer" style="height: 300px; width: 100%"></div>`;

  document.body.append(notification); // Adds pop-up to the page

  const chart = new CanvasJS.Chart('chartContainer', {
    animationEnabled: true,
    legend: {
      cursor: 'pointer'
    },
    data: [
      {
        type: 'doughnut',
        startAngle: 60,
        showInLegend: true,
        indexLabelFontSize: 17,
        indexLabel: '{name} - {y}g',
        toolTipContent: '<b>{name}:</b> {y}g (#percent)%',
        dataPoints: [
          { y: fat, name: 'Fat' },
          { y: protein, name: 'Protein' },
          { y: sodium / 1000, name: 'Sodium' }, // Converts mg to g
          { y: carbs, name: 'Carbs' },
          { y: cholesterol / 1000, name: 'Cholesterol' } // Converts mg to g
        ]
      }
    ]
  });

  // listens for the delete button on the pop-up to be clicked
  document.querySelector('.delete').addEventListener('click', () => {
    chart.destroy(); // Destroys the chart object
    notification.parentNode.removeChild(notification); // removes pop-up form the page
  });

  chart.render(); // Renders the chart object to the screen
}

async function populateMacros() {
  const targetList = document.querySelector('tbody');
  const customRequest = await fetch('/api/table/data');
  const macrosData = await customRequest.json();

  macrosData.forEach((meal) => {
    const appendItem = document.createElement('tr');
    appendItem.innerHTML = `
    <td>${meal.meal_name}</td>
    <td>${meal.calories}</td>
    <td>${meal.carbs}g</td>
    <td>${meal.sodium}mg</td>
    <td>${meal.protein}g</td>
    <td>${meal.fat}g</td>
    <td>${meal.cholesterol}mg</td>`;
    appendItem.addEventListener('click', () => {
      createNotification(
        meal.meal_name,
        meal.protein,
        meal.fat,
        meal.carbs,
        meal.cholesterol,
        meal.sodium
      );
    });
    targetList.append(appendItem);
  });
}

//  This function fetches all dining hall data then populates the restaurants on the home page
async function populateRestaurants() {
  const targetBox = document.querySelector('.tile');
  const diningRequest = await fetch('/api/dining');
  const diningData = await diningRequest.json();

  diningData.data.forEach((restaurant) => {
    const appendItem = document.createElement('div');
    appendItem.classList.add('tile', 'has-text-centered', 'is-parent', 'is-3');
    appendItem.innerHTML = `
    <article class="tile is-child box has-background-link-dark ">
    <span class="subtitle has-text-light has-text-weight-bold">${
  restaurant.hall_name
}</span>
    <br />
    <span class="has-text-light">${restaurant.hall_address.split(',')[0]}</span>
    <br/>
    <span class="has-text-light">${restaurant.hall_address.split(',')[1]}</span>
    </article>`;
    targetBox.append(appendItem);
  });
}

function mapScript() {
  const mymap = L.map('mapid').setView([38.988751, -76.94774], 14);

  L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken:
        'pk.eyJ1IjoiYWxlaXRjaDEtdW1kLWVkdSIsImEiOiJjazhpdTF3Y28wYTIzM2twNnAxc2g2N2tnIn0.I1tMmZhRRNRt3LF7QnnB4g'
    }
  ).addTo(mymap);
  return mymap;
}

async function dataFilter(mapFromMapFunction) {
  const form = document.querySelector('#search-form');
  const search = document.querySelector('#search');
  const targetList = document.querySelector('.target-list');
  const replyMessage = document.querySelector('.reply-message');

  const request = await fetch('/api/map/data');
  const data = await request.json();

  // this code fires when our form submits
  // it filters our data list and returns it to the HTML
  form.addEventListener('submit', async (event) => {
    targetList.innerText = '';

    event.preventDefault();
    // eslint-disable-next-line max-len
    // make sure each returned restaurant _can_ be plotted on the map by checking for the value we need
    const filtered = data.filter(
      (record) => (record.meal_name.toUpperCase().includes(search.value.toUpperCase())
          && record.hall_lat)
        || (record.hall_name.toUpperCase().includes(search.value.toUpperCase())
          && record.hall_lat)
    );
    const topFive = filtered.slice(0, 5);

    if (topFive.length < 1) {
      replyMessage.classList.add('box');
      replyMessage.innerText = 'No matches found';
    }

    topFive.forEach((item) => {
      const Lat = item.hall_lat;
      const Long = item.hall_long;
      const marker = L.marker([Lat, Long]).addTo(mapFromMapFunction);
      const popup = L.popup()
        .setLatLng([Lat, Long])
        .setContent(`<p>${item.hall_name}</p>`)
        .openOn(mapFromMapFunction);
      marker.bindPopup(popup).openPopup();
      mapFromMapFunction.addLayer(marker);
      const appendItem = document.createElement('li');
      appendItem.classList.add('block', 'list-item');
      appendItem.innerHTML = `<div class="block"><div class="list-header is-size-5">${item.meal_name}</div><address class="is-size-6">${item.hall_name}</address></div>`;
      targetList.append(appendItem);
    });
    const Lat = topFive[0]?.hall_lat;
    const Long = topFive[0]?.hall_long;
    mapFromMapFunction.panTo([Lat, Long], 0);
  });

  // this listens for typing into our input box
  search.addEventListener('input', (event) => {
    if (search.value.length === 0) {
      // clear your "no matches found" code
      targetList.innerText = '';
    }
  });
}
async function windowActions() {
  populateMacros();
  populateRestaurants();
  const mapObject = mapScript(); // Load your map
  await dataFilter(mapObject); // load your food data
}

window.onload = windowActions;
(document.querySelectorAll('.notification .delete') || []).forEach(
  ($delete) => {
    const $notification = $delete.parentNode;

    $delete.addEventListener('click', () => {
      $notification.parentNode.removeChild($notification);
    });
  }
);
