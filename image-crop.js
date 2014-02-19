
var ImageCrop = function(input_el, canvas_el, onload_callback){
	
	var IC = this;
	
	// Save params
	IC._file_field = $(input_el);
	IC._canvas = $(canvas_el);
	IC._canvas_ctx = IC._canvas[0].getContext('2d');
	IC._onload_callback = onload_callback;
	
	// Save canvas details
	IC._canvas_h = $(IC._canvas).height();
	IC._canvas_w = $(IC._canvas).width();
	
	// The current offset for drawing the image on the canvas
	IC._offset_x = 0;
	IC._offset_y = 0;
	
	// Min and max offsets (bounds)
	IC._offset_min_x;
	IC._offset_max_x = 0;
	IC._offset_min_y;
	IC._offset_max_y = 0;
	
	// Dragging position when last checked
	IC._drag_last_x;
	IC._drag_last_y;
	
	// Image details
	IC._img;
	
	// Image dimensions
	IC._img_orig_h; // Original
	IC._img_orig_w;
	IC._img_min_h; // Minimum
	IC._img_min_w;
	IC._img_h; // Current
	IC._img_w;
	
	// State
	IC._is_dragging = false;
	
	IC._dump = function(){
		
		var dump_obj = {
			offset_x : IC._offset_x || null,
			offset_y : IC._offset_y || null,
			offset_min_x : IC._offset_min_x || null,
			offset_min_y : IC._offset_min_y || null,
			img_w : IC._img_w || null,
			img_h : IC._img_h || null,
			img_min_h : IC._img_min_h || null,
			img_orig_h : IC._img_orig_h || null,
			img_min_w : IC._img_min_w || null,
			img_orig_w : IC._img_orig_w || null
		};
		
		console.log(JSON.stringify(dump_obj));
		
	};
	
	IC.init = function(){
		
		// Watch file input
		IC._file_field.on('change', function(e){
			
			// Read the input
			if(IC._read_input(IC._file_field, e)){
				
				// If it is a valid image, run the load callback
				if(IC._onload_callback){
					IC._onload_callback();
				}
			
			}
			
		});
		
		// Attach canvas mouse events
		IC._attach_pan_events();
		
	};
	
	IC._attach_pan_events = function(){
		
		var get_event_offset = function(e){
			
			// Most browsers
			if(e.offsetX){
				return {
					x : e.offsetX,
					y : e.offsetY
				}
			}
			
			// Firefox
			if(e.originalEvent.layerX){
				return {
					x : parseInt(e.originalEvent.layerX, 10),
					y : parseInt(e.originalEvent.layerY, 10)
				}
			}
			
		};
		
		IC._canvas.on('mousedown', function(e){
			
			IC._is_dragging = true;
			
			var event_offset = get_event_offset(e);
			
			// Save the drag start position
			IC._drag_last_x = event_offset.x;
			IC._drag_last_y = event_offset.y;
			
		});
		
		IC._canvas.on('mouseup mouseout', function(e){
			
			IC._is_dragging = false;
			
		});
		
		IC._canvas.on('mousemove', function(e){
			
			if(!IC._is_dragging){
				return;
			}
			
			var event_offset = get_event_offset(e);
			
			// Calculate the offset adjustment
			var add_offset_x = event_offset.x - IC._drag_last_x;
			var add_offset_y = event_offset.y - IC._drag_last_y;
			
			// Adjust the offset
			IC._adjust_offset(add_offset_x, add_offset_y);
			
			// Update last drag position
			IC._drag_last_x = event_offset.x;
			IC._drag_last_y = event_offset.y;
			
			// Render
			IC._render_image();
			
		});
		
	};
	
	IC._read_input = function(file_field, e){
		
		// Unsupported Browser
		if(!e.target.files){
			
			// TODO Proper error
			alert('You are using an insecure, outdated browser. For your security, please upgrade to the latest version.');
			
			return false;
		}
		
		// No files selected
		if(!e.target.files.length){
			return false;
		}
		
		var img_file = e.target.files[0];
		
		// Check image type
		if(!img_file.type.match('image.*')){
			
			// TODO Proper Error
			console.log('Unsupported image type');
			
			return false;
		}
		
		IC._img = new Image;
		
		IC._img.onload = function(){
			
			// Save orig width and height
			IC._img_orig_h = IC._img.height;
			IC._img_orig_w = IC._img.width;
			
			IC._examine_image();
			
			// Set initial viewing size
			IC._img_h = IC._img_min_h;
			IC._img_w = IC._img_min_w;
			
			// Set initial offset (center it)
			IC._offset_x = ((IC._img_w / 2) * -1) + IC._canvas_w/2;
			IC._offset_y = ((IC._img_h / 2) * -1) + IC._canvas_h/2;
			
			// Calculate initial offset bounds
			IC._calculate_bounds();
			
			// Draw the image
			IC._render_image();
			
		};
		
		// Read the image
		var url_obj = window.URL || webkitURL;
		IC._img.src = url_obj.createObjectURL(img_file);
		
		return true;
		
	};

	IC._examine_image = function(){
		// Calculate min size, figure out orientation
		
		// Calculate minimum size that will fit in the canvas
		var step = 0;
		var min_h = 0, min_w = 0;
		
		while(min_h < IC._canvas_h || min_w < IC._canvas_w){
			// While min_h is smaller than the canvas height or
			// min_w is smaller than the canvas width, keep incrementing
			
			min_h = IC._img_orig_h * step;
			min_w = IC._img_orig_w * step;
			
			// Increase by 0.1%
			step += 0.001;
			
			// Infinte loop prevention
			if(step > 100){
				// Something went wrong
				// eg, the source image is smaller than the canvas? 
				
				break;
			}
		}
		
		IC._img_min_h = min_h;
		IC._img_min_w = min_w;
		
	};
	
	IC._render_image = function(){
		
		IC._canvas_ctx.clearRect(0, 0, IC._canvas_w, IC._canvas_h);
		
		IC._canvas_ctx.drawImage(
			IC._img,
			IC._offset_x,
			IC._offset_y,
			IC._img_w,
			IC._img_h
		);
		
	};
	
	IC._calculate_bounds = function(){
		
		IC._offset_min_x = (IC._img_w - IC._canvas_w) * -1;
		IC._offset_min_y = (IC._img_h - IC._canvas_h) * -1;
		
	};
	
	IC._adjust_offset = function(add_offset_x, add_offset_y){
		
		// Apply offset adjustment
		IC._offset_x += add_offset_x;
		IC._offset_y += add_offset_y;
		
		// Validate offset adjustment
		var valid_adjustment = true;
		var x_too_high = IC._offset_x > IC._offset_max_x;
		var x_too_low = IC._offset_x < IC._offset_min_x;
		var y_too_high = IC._offset_y > IC._offset_max_y;
		var y_too_low = IC._offset_y < IC._offset_min_y;
		
		if(x_too_high || x_too_low || y_too_high || y_too_low){
			valid_adjustment = false;
		}
		
		// If invalid (out of bounds), move inside bounds
		if(!valid_adjustment){
			
			if(x_too_high){
				IC._offset_x = IC._offset_max_x;
			}else if(x_too_low){
				IC._offset_x = IC._offset_min_x;
			}
			
			if(y_too_high){
				IC._offset_y = IC._offset_max_y;
			}else if(y_too_low){
				IC._offset_y = IC._offset_min_y;
			}
			
			if(IC._offset_x === null){
				console.log('X NULL');
			}
			if(IC._offset_y === null){
				console.log('Y NULL');
			}
			
		}
		
	};
	
	IC.zoom = function(zoom_percent){
		// Zoom an image by the given percent
		
		// Calculate size adjustment
		var add_size_h = (IC._img_orig_h) * (zoom_percent/100);
		var add_size_w = (IC._img_orig_w) * (zoom_percent/100);
		
		// Apply size adjustment
		IC._img_h += add_size_h;
		IC._img_w += add_size_w;
		
		// Validate size adjustment
		var valid_adjustment = true;
		var too_wide = IC._img_w > IC._img_orig_w;
		var too_narrow = IC._img_w < IC._img_min_w;
		var too_tall = IC._img_h > IC._img_orig_h;
		var too_short = IC._img_h < IC._img_min_h;
		
		if(too_wide || too_narrow || too_tall || too_short){
			valid_adjustment = false;
		}
		
		// If invalid, revert to limit
		if(!valid_adjustment){
			
			if(too_wide || too_tall){
				IC._img_h = IC._img_orig_h;
				IC._img_w = IC._img_orig_w;
			}else if(too_narrow || too_short){
				IC._img_h = IC._img_min_h;
				IC._img_w = IC._img_min_w;
			}
			
			add_size_h = 0;
			add_size_w = 0;
		}
		
		// Re-calculate bounds
		IC._calculate_bounds();
		
		// Calculate offset adjustment
		var add_offset_y = (add_size_h/2) * -1;
		var add_offset_x = (add_size_w/2) * -1;
		
		// Adjust the offset
		IC._adjust_offset(add_offset_x, add_offset_y);
		
		// Render
		IC._render_image();
		
	};
	
	IC.read = function(){
		
		return IC._canvas[0].toDataURL();
		
	};
	
	// Start
	IC.init();
	
};

