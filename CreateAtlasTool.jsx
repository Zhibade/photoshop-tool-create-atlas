// --- Atlas Creation Tool ---


#target photoshop


/**
 * Initializes the UI and callbacks
 */
function InitUI()
{
	var window = new Window("dialog", "Create Animation Atlas Tool");
	var directoryGroup = window.add("group");
	directoryGroup.add("statictext", undefined, "Source Dir: ")
	var dirText = directoryGroup.add("edittext", undefined, "~/Desktop");
	dirText.characters = 30;
	var browseButton = directoryGroup.add("button", undefined, "Browse");
	
	var sourcePath;
	
	browseButton.onClick = function() 
	{
		sourcePath = DirPrompt();
		dirText.text = String(sourcePath);
	}
	
	var checkboxGroup = window.add("group");
	checkboxGroup.add("statictext", undefined, "Atlas size: ")
	checkboxGroup.add("radiobutton", undefined, "256");
	checkboxGroup.add("radiobutton", undefined, "512");
	checkboxGroup.add("radiobutton", undefined, "1024");
	checkboxGroup.add("radiobutton", undefined, "2048");
	checkboxGroup.add("radiobutton", undefined, "4096");
	
	checkboxGroup.children[1].value = true;
	
	var buttonGroup = window.add("group");
	buttonGroup.aligment = "right";
	var runButton = buttonGroup.add("button", undefined, "Run", {name: "ok"});
	
	runButton.onClick = function() 
	{
		var selectedSize;
		
		for (var i = 1; i < checkboxGroup.children.length; i++)
		{
			if (checkboxGroup.children[i].value == true)
			{
				selectedSize = Math.pow(2, i+7); // Get power of 2 value starting from 256 (matching UI);
			}
		}
		
		window.close();
		
		RunTool(sourcePath, selectedSize);
	}
	
	window.show();
}

/**
 * Finds all image files in the given path and returns the file list
 * @param  {String} 	path 				Path to get all the image files from
 * @param  {Boolean} 	subfolders 	Whether to include subfolders or not
 * @return {Array}      					Image file list
 */
function FindFilesInPath(path, subfolders)
{
	var folder = new Folder(path);
	
	var files = folder.getFiles();
	
	var fileList = [];
	
	for (var i = 0; i < files.length; i++)
	{
		if (files[i] instanceof File)
		{
			var filePath = String(files[i]);
			
			if (filePath.match(/.(jpg|tif|png|gif|tga)$/))
			{
				fileList.push(files[i]);
			}
		}
		else
		{
			if (subfolders)
			{
				FindFilesInPath(files[i]);
			}
		}
	}
	
	return fileList;
}

/**
 * Selects all non transparent pixels of the currently opened image
 */
function SelectNonTransparentPixels()
{
	var desc = new ActionDescriptor();
	var ref = new ActionReference();
	ref.putProperty( charIDToTypeID( "Chnl" ), charIDToTypeID( "fsel" ) );
	desc.putReference( charIDToTypeID( "null" ), ref );
	var ref1 = new ActionReference();
	ref1.putEnumerated( charIDToTypeID( "Chnl" ), charIDToTypeID( "Chnl" ), charIDToTypeID( "Trsp" ) );
	desc.putReference( charIDToTypeID( "T   " ), ref1 );
	executeAction( charIDToTypeID( "setd" ), desc, DialogModes.NO );
}

/**
 * Opens and processeses the given image. Then pastes it on the atlas document
 * @param  {String} image 	Source image path
 * @param  {Array} 	size 		Target size in X and Y
 * @param  {Array} 	pos 		Target position in X and Y on the atlas document
 * @param  {Number} num 		ID of the image
 */
function ProcessImage(image, size, pos, num)
{
	var atlasDoc = app.activeDocument;
	var currentImage;
	
	try
	{
		currentImage = app.open(image);
	}
	catch(err)
	{
		throw("Could not find any valid images within the selected directory. Valid formats are: PNG, TGA, GIF, JPG, TIFF");
	}

	app.activeDocument = currentImage;
	currentImage.layers[0].isBackgroundLayer = false;
	currentImage.resizeImage(size[0], size[1]);
	currentImage.selection.selectAll();
	currentImage.selection.copy();
	
	app.activeDocument = atlasDoc;
	var pastedFrame = atlasDoc.paste();
	pastedFrame.name = "Frame " + num
	
	var layerPos = pastedFrame.bounds;
	layerPos[0] = pos[0] - layerPos[0];
	layerPos[1] = pos[1] - layerPos[1];

	pastedFrame.translate(-layerPos[0],-layerPos[1]);
	
	if (currentImage.channels.length > 3)
	{
		app.activeDocument = currentImage;
		currentImage.activeChannels = [currentImage.channels[3]];
		currentImage.selection.selectAll();
		currentImage.selection.copy();
		app.activeDocument = atlasDoc;
		
		var alphaLayer = atlasDoc.paste();
		
		var alphaLayerPos = alphaLayer.bounds;
		alphaLayerPos[0] = pos[0] - alphaLayerPos[0];
		alphaLayerPos[1] = pos[1] - alphaLayerPos[1];
		
		alphaLayer.move(layers[0], ElementPlacement.PLACEBEFORE);
		var mergedLayer = alphaLayer.merge();
		
		atlasDoc.selection.selectAll();
		atlasDoc.selection.copy();
		atlasDoc.activeChannels = [atlasDoc.channels[3]];
		atlasDoc.paste();
		atlasDoc.activeChannels = [atlasDoc.channels[0], atlasDoc.channels[1], atlasDoc.channels[2]];
	}
	
	if (currentImage.name.toLowerCase().indexOf(".png"))
	{
		SelectNonTransparentPixels();
		
		var fillColor = new SolidColor();
		fillColor.rgb.red = 255;
		fillColor.rgb.green = 255;
		fillColor.rgb.blue = 255;
		
		var alphaLayer = atlasDoc.artLayers.add();
		atlasDoc.selection.fill(fillColor);
		atlasDoc.selection.deselect();
		
		alphaLayer.move(atlasDoc.layers[0], ElementPlacement.PLACEBEFORE);
		var mergedLayer = alphaLayer.merge();
		
		atlasDoc.selection.selectAll();
		atlasDoc.selection.copy();
		atlasDoc.activeChannels = [atlasDoc.channels[3]];
		atlasDoc.paste();
		atlasDoc.activeChannels = [atlasDoc.channels[0], atlasDoc.channels[1], atlasDoc.channels[2]];
	}
	
	currentImage.close(SaveOptions.DONOTSAVECHANGES);
}

/**
 * Opens a directory prompt dialog and returns the selected path
 * @return {String}		Selected folder
 */
function DirPrompt()
{
	var folder = Folder.selectDialog("Select the directory that contains the frames");
	return folder;
}

/**
 * Sets the TGA save options
 * @return {Object}		Targa save options object
 */
function TGAOptions()
{
	var tgaSave = new TargaSaveOptions();
	tgaSave.alphaChannels = true;
	tgaSave.resolution = TargaBitsPerPixels.THIRTYTWO;
	return tgaSave;
}

/**
 * Runs the main functionality of the tool and shows a save dialog when finished
 * @param  {String} 	path 	Path where the image files are found
 * @param  {Number} 	size 	Size of the atlas (both X and Y)
 */
function RunTool(path, size)
{
	var rulers = app.preferences.rulerUnits;
	app.preferences.rulerUnits = Units.PIXELS;
	
	var bgColor = new SolidColor();
	bgColor.rgb.red = 0;
	bgColor.rgb.green = 0;
	bgColor.rgb.blue = 0;
	
	var atlasDoc = app.documents.add(size, size, 72, "AnimationAtlas", NewDocumentMode.RGB);
	atlasDoc.selection.selectAll();
	atlasDoc.selection.fill(bgColor);
	atlasDoc.selection.deselect();
	atlasDoc.layers[0].isBackgroundLayer = false;
	
	var fileList = FindFilesInPath(path, false);
	
	var sampleFile = fileList[0];
	
	var sampleImage;
	
	try
	{
		sampleImage = app.open(sampleFile);
	}
	catch(err)
	{
		throw("Could not find any valid images within the selected directory. Valid formats are: PNG, TGA, GIF, JPG, TIFF");
	}
	
	app.activeDocument = atlasDoc;

	if (sampleImage.channels.length > 3 || sampleImage.name.toLowerCase().indexOf(".png"))
	{
		atlasDoc.channels.add();
		var finalAlpha = atlasDoc.artLayers.add();
		finalAlpha.name = "Alpha_Layer";
		
		atlasDoc.selection.selectAll();
		atlasDoc.selection.fill(bgColor);
		atlasDoc.selection.deselect();
	}
	
	var targetSizeX;
	var targetSizeY;
	
	var ImagesInX;
	var ImagesInY;
	
	var imageRatio = sampleImage.width/sampleImage.height;
	
	if (imageRatio >= 1)
	{
		ImagesInX = Math.round(Math.sqrt(fileList.length));
		ImagesInY = ImagesInX / imageRatio;
	}
	else
	{
		ImagesInY = Math.round(Math.sqrt(fileList.length));
		ImagesInX = ImagesInY * imageRatio;
	}
	
	targetSizeX = Math.floor(size/ImagesInX);
	targetSizeY = Math.floor(size/ImagesInY);

	sampleImage.close();
	
	var j = 0;
	
	for (var i = 0; i < fileList.length; i++)
	{
		var modulusInX = i%ImagesInX;
		
		if (modulusInX == 0 && i > 0)
		{
			j++;
		}
		
		var targetPosX = targetSizeX * modulusInX;
		var targetPosY = targetSizeY * j;
		
		atlasDoc.activeLayer = atlasDoc.layers[1];
		ProcessImage(fileList[i], [targetSizeX, targetSizeY], [targetPosX, targetPosY], i);
	}
	
	atlasDoc.layers[0].visible = false;
	
	var saveDir = File.saveDialog("Save atlas file", ".tga");
	var saveOptions = TGAOptions();
	
	atlasDoc.saveAs(saveDir, saveOptions, true); 
	
	app.preferences.rulerUnits = rulers;
}

// --- MAIN ---
InitUI();